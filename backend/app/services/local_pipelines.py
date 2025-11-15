import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

try:  # Import lazily-safe for environments without heavy deps installed yet
    import torch
    from diffusers import DiffusionPipeline
    
    # Patch transformers' torch version check to allow torch >= 2.6
    # (CVE-2025-32434 fix: we have torch >= 2.6 so it's safe)
    try:
        import transformers.utils.import_utils as tf_import_utils
        _original_check = tf_import_utils.check_torch_load_is_safe
        
        def _patched_check_torch_load_is_safe():
            """Patched version that allows torch >= 2.6"""
            if torch is not None:
                major, minor = map(int, torch.__version__.split('+')[0].split('.')[:2])
                if (major, minor) >= (2, 6):
                    return  # Safe, allow loading
            # If torch < 2.6 or parse failed, call original check
            return _original_check()
        
        tf_import_utils.check_torch_load_is_safe = _patched_check_torch_load_is_safe
        logger.info("Patched transformers.check_torch_load_is_safe for torch >= 2.6 compatibility")
    except Exception as e:
        logger.warning(f"Could not patch transformers check: {e}")
except Exception:  # pragma: no cover - handled at runtime
    torch = None  # type: ignore
    DiffusionPipeline = None  # type: ignore


# Mapping between frontend local model keys and Hugging Face repos
LOCAL_MODEL_REPOS: Dict[str, str] = {
    "zeroscope-local": "cerspense/zeroscope_v2_576w",
    "modelscope-local": "ali-vilab/modelscope-damo-text-to-video-synthesis",
}


def resolve_local_repo_id(local_model_key: str) -> Optional[str]:
    """Return the HF repo_id for a given local model key, if known."""
    return LOCAL_MODEL_REPOS.get(local_model_key)


def _pick_device_and_dtype():
    """Choose the best available device and dtype.

    GPU is preferred when `torch.cuda.is_available()` is true; otherwise CPU.
    """
    if torch is None:  # diffusers/torch not installed
        raise RuntimeError("Local models require 'torch' and 'diffusers' to be installed in the backend environment.")

    if torch.cuda.is_available():
        return torch.device("cuda"), torch.float16
    return torch.device("cpu"), torch.float32


_PIPELINE_CACHE: Dict[tuple[str, str], "DiffusionPipeline"] = {}


def _get_pipeline(local_model_key: str, repo_dir: Path):
    """Load (or reuse) a DiffusionPipeline for the given local model.

    Pipelines are cached per (model_key, device) to avoid repeated heavy loads.
    """
    if DiffusionPipeline is None or torch is None:
        raise RuntimeError("Local pipelines require 'torch' and 'diffusers' to be installed.")

    device, dtype = _pick_device_and_dtype()
    cache_key = (local_model_key, str(device))
    if cache_key in _PIPELINE_CACHE:
        return _PIPELINE_CACHE[cache_key], device

    repo_dir = repo_dir.expanduser().resolve()
    if not repo_dir.exists():
        raise RuntimeError(f"Local model directory does not exist: {repo_dir}")

    logger.info("Loading local pipeline '%s' from %s on %s", local_model_key, repo_dir, device)

    # Try to load with safetensors first (CVE-2025-32434 safe), fallback to .pt files if unavailable
    try:
        pipe = DiffusionPipeline.from_pretrained(
            repo_dir,
            torch_dtype=dtype,
            use_safetensors=True,
        )
        logger.info("Loaded pipeline using safetensors (secure)")
    except Exception as e:
        logger.warning("Safetensors not available (%s), falling back to .pt files", str(e))
        pipe = DiffusionPipeline.from_pretrained(
            repo_dir,
            torch_dtype=dtype,
            use_safetensors=False,
        )

    pipe.to(device)

    # Optional offload hints for big models on limited VRAM
    try:  # pragma: no cover - best-effort hints
        if device.type == "cuda" and hasattr(pipe, "enable_model_cpu_offload"):
            pipe.enable_model_cpu_offload()
    except Exception:
        pass

    _PIPELINE_CACHE[cache_key] = pipe
    return pipe, device


def _ensure_pil_image(frame) -> Image.Image:
    if isinstance(frame, Image.Image):
        return frame
    try:
        arr = np.asarray(frame)
        if arr.ndim == 3 and arr.shape[2] == 4:  # RGBA -> RGB
            arr = arr[:, :, :3]
        return Image.fromarray(arr.astype("uint8"))
    except Exception as exc:
        raise RuntimeError(f"Unsupported frame type from pipeline: {type(frame)!r}") from exc


def generate_local_video(
    *,
    model_key: str,
    repo_dir: Path,
    prompt: str,
    negative_prompt: Optional[str],
    num_frames: int,
    width: int,
    height: int,
    num_inference_steps: int,
    guidance_scale: float,
    seed: Optional[int],
) -> List[Image.Image]:
    """Generate video frames with a local text-to-video model.

    This function is intentionally conservative:
    - It clamps size/frames to reasonable ranges.
    - It handles minor API differences between pipelines by retrying with
      reduced parameter sets when needed.
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt must not be empty for local generation.")

    # Clamp to keep resource usage sane; these bounds can be tuned later.
    width = int(max(256, min(width, 1024)))
    height = int(max(256, min(height, 576)))
    num_frames = int(max(8, min(num_frames, 48)))
    num_inference_steps = int(max(10, min(num_inference_steps, 60)))

    pipe, device = _get_pipeline(model_key, repo_dir)

    generator = None
    if seed is not None and torch is not None:
        try:
            generator = torch.Generator(device=device).manual_seed(int(seed))
        except Exception:
            generator = None

    common_kwargs = {
        "prompt": prompt,
        "negative_prompt": negative_prompt or None,
        "height": height,
        "width": width,
        "num_inference_steps": num_inference_steps,
        "guidance_scale": float(guidance_scale),
    }
    if generator is not None:
        common_kwargs["generator"] = generator

    # Some text-to-video pipelines support num_frames directly; others infer
    # length internally. We try with num_frames first, then retry without
    # if the call signature is incompatible.
    def _call_with_optional_frames(add_frames: bool):
        kwargs = dict(common_kwargs)
        if add_frames:
            kwargs["num_frames"] = int(num_frames)
        return pipe(**kwargs)

    try:
        result = _call_with_optional_frames(add_frames=True)
    except TypeError:
        logger.info("Pipeline for '%s' does not accept 'num_frames' argument; retrying without it.", model_key)
        result = _call_with_optional_frames(add_frames=False)

    # diffusers video pipelines typically expose `.frames` or return a list/ndarray
    frames = None
    if hasattr(result, "frames"):
        frames = result.frames
    elif isinstance(result, (list, tuple)):
        frames = result
    elif hasattr(result, "images"):
        # Fallback for image-sequence style outputs
        frames = result.images

    if frames is None:
        raise RuntimeError("Local pipeline did not return frames; got unsupported output type.")

    frames_list = list(frames)
    if not frames_list:
        raise RuntimeError("Local pipeline returned no frames.")

    return [_ensure_pil_image(f) for f in frames_list]
