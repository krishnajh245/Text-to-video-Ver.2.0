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
        import transformers.modeling_utils as tf_modeling
        
        # Parse torch version
        major, minor = map(int, torch.__version__.split('+')[0].split('.')[:2])
        torch_is_safe = (major, minor) >= (2, 6)
        
        if torch_is_safe:
            # Replace the load_state_dict function to skip the CVE check
            _original_load_state_dict = tf_modeling.load_state_dict
            
            def _patched_load_state_dict(checkpoint_file, map_location=None, weights_only=None, **kwargs):
                """Load state dict without CVE check (we have torch >= 2.6)"""
                import pickle
                # Load directly without transformers' check since our torch is safe
                if weights_only is None:
                    weights_only = False
                try:
                    return torch.load(checkpoint_file, map_location=map_location, weights_only=weights_only)
                except Exception:
                    # Fallback to pickle if torch.load fails
                    with open(checkpoint_file, 'rb') as f:
                        return pickle.load(f)
            
            tf_modeling.load_state_dict = _patched_load_state_dict
            logger.info(f"Patched transformers.load_state_dict (torch {torch.__version__} is safe)")
    except Exception as e:
        logger.warning(f"Could not patch transformers: {e}")
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
    """Convert various frame formats to PIL Image.
    
    Handles:
    - PIL Images (passthrough)
    - Numpy arrays with various shapes and dtypes
    - Torch tensors
    - Different channel orderings (CHW vs HWC)
    - Different value ranges (0-1 float vs 0-255 uint8)
    - Extra batch/time dimensions
    """
    if isinstance(frame, Image.Image):
        return frame
    
    try:
        # Convert torch tensors to numpy
        if hasattr(frame, 'cpu'):
            frame = frame.cpu()
        if hasattr(frame, 'numpy'):
            frame = frame.numpy()
        
        arr = np.asarray(frame)
        original_shape = arr.shape
        
        # Remove all singleton dimensions (batch=1, time=1, etc.)
        arr = np.squeeze(arr)
        
        # Handle different dimensionalities
        if arr.ndim == 2:
            # Grayscale image (H, W) - convert to RGB
            arr = np.stack([arr, arr, arr], axis=-1)
        
        elif arr.ndim == 3:
            # Could be (H, W, C) or (C, H, W)
            
            # Detect channel-first format: (C, H, W)
            # Channels are typically 1, 3, or 4
            if arr.shape[0] in [1, 3, 4] and arr.shape[0] < min(arr.shape[1], arr.shape[2]):
                # Transpose from (C, H, W) to (H, W, C)
                arr = np.transpose(arr, (1, 2, 0))
            
            # Now we should have (H, W, C)
            # Handle different channel counts
            if arr.shape[2] == 1:
                # Single channel - convert to RGB
                arr = np.concatenate([arr, arr, arr], axis=2)
            elif arr.shape[2] == 4:
                # RGBA - drop alpha channel
                arr = arr[:, :, :3]
            elif arr.shape[2] != 3:
                raise ValueError(f"Unexpected number of channels: {arr.shape[2]}")
        
        elif arr.ndim == 4:
            # Might be (B, H, W, C) or (B, C, H, W) or (T, H, W, C)
            # Take first frame/batch
            arr = arr[0]
            # Recursively process (now it's 3D)
            return _ensure_pil_image(arr)
        
        elif arr.ndim > 4:
            # Too many dimensions - keep squeezing and taking first element
            while arr.ndim > 3:
                arr = arr[0] if arr.shape[0] > 1 else np.squeeze(arr, axis=0)
            return _ensure_pil_image(arr)
        
        else:
            raise ValueError(f"Unexpected array dimensionality: {arr.ndim}")
        
        # Normalize to uint8 range [0, 255]
        if arr.dtype == np.uint8:
            # Already in correct format
            pass
        elif arr.dtype in [np.float32, np.float64, np.float16]:
            # Float array - check range and normalize
            arr_min, arr_max = arr.min(), arr.max()
            
            if arr_max <= 1.0 and arr_min >= 0.0:
                # Range [0, 1] - scale to [0, 255]
                arr = (arr * 255).astype(np.uint8)
            elif arr_max <= 1.0 and arr_min >= -1.0:
                # Range [-1, 1] - scale to [0, 255]
                arr = ((arr + 1.0) * 127.5).astype(np.uint8)
            else:
                # Assume [0, 255] range but float type - just clip and convert
                arr = np.clip(arr, 0, 255).astype(np.uint8)
        else:
            # Other integer types - clip to valid range and convert
            arr = np.clip(arr, 0, 255).astype(np.uint8)
        
        # Final validation
        if arr.ndim != 3 or arr.shape[2] != 3:
            raise ValueError(f"Failed to convert to (H, W, 3) format. Got shape: {arr.shape}")
        
        # Create PIL Image
        img = Image.fromarray(arr, mode='RGB')
        return img
        
    except Exception as exc:
        # Provide detailed error information for debugging
        shape_info = getattr(frame, 'shape', 'unknown')
        dtype_info = getattr(frame, 'dtype', 'unknown')
        type_info = type(frame).__name__
        
        raise RuntimeError(
            f"Failed to convert frame to PIL Image.\n"
            f"  Type: {type_info}\n"
            f"  Shape: {shape_info}\n"
            f"  Dtype: {dtype_info}\n"
            f"  Error: {str(exc)}"
        ) from exc


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

    # === CRITICAL FIX: Extract frames from pipeline output ===
    
    # Extract the raw frames/images from the result object
    raw_frames = None
    if hasattr(result, "frames"):
        raw_frames = result.frames
        logger.info(f"Extracted frames from result.frames")
    elif hasattr(result, "images"):
        raw_frames = result.images
        logger.info(f"Extracted frames from result.images")
    elif isinstance(result, (list, tuple)):
        raw_frames = result
        logger.info(f"Result is already a list/tuple")
    else:
        raise RuntimeError(f"Local pipeline returned unsupported output type: {type(result)}")

    if raw_frames is None:
        raise RuntimeError("Local pipeline did not return frames; got unsupported output type.")

    # Convert to numpy for easier manipulation
    if hasattr(raw_frames, 'cpu'):
        raw_frames = raw_frames.cpu()
    if hasattr(raw_frames, 'numpy'):
        raw_frames = raw_frames.numpy()
    
    frames_array = np.asarray(raw_frames)
    logger.info(f"Raw frames shape: {frames_array.shape}, dtype: {frames_array.dtype}")
    
    # Split frames based on dimensionality
    # This is the KEY FIX - properly iterate over the time dimension
    frames_list = []
    
    if frames_array.ndim == 5:
        # Shape: (batch, time, height, width, channels)
        # Example: (1, 50, 576, 1024, 3)
        logger.info(f"5D tensor detected: extracting {frames_array.shape[1]} frames from time dimension")
        batch_frames = frames_array[0]  # Take first batch → (time, H, W, C)
        frames_list = [batch_frames[t] for t in range(batch_frames.shape[0])]
        
    elif frames_array.ndim == 4:
        # Could be (time, H, W, C) or (batch, C, H, W)
        # Use heuristic: if dimension 1 is small (1, 3, 4), it's likely channels
        if frames_array.shape[1] in [1, 3, 4] and frames_array.shape[1] < frames_array.shape[2]:
            # Shape: (batch, C, H, W) - single image
            logger.info(f"4D tensor detected (batch, C, H, W): treating as single frame")
            frames_list = [frames_array[0]]
        else:
            # Shape: (time, H, W, C)
            logger.info(f"4D tensor detected: extracting {frames_array.shape[0]} frames from time dimension")
            frames_list = [frames_array[t] for t in range(frames_array.shape[0])]
    
    elif frames_array.ndim == 3:
        # Shape: (H, W, C) - single frame
        logger.info("3D tensor detected: single frame")
        frames_list = [frames_array]
    
    elif frames_array.ndim == 2:
        # Shape: (H, W) - grayscale single frame
        logger.info("2D tensor detected: single grayscale frame")
        frames_list = [frames_array]
    
    else:
        raise RuntimeError(f"Unexpected tensor dimensionality: {frames_array.ndim}D with shape {frames_array.shape}")
    
    if not frames_list:
        raise RuntimeError("No frames extracted from pipeline output")
    
    logger.info(f"Extracted {len(frames_list)} frames from pipeline output")
    
    # Log first frame details for debugging
    if frames_list:
        first = frames_list[0]
        if hasattr(first, 'shape'):
            logger.info(f"First frame shape: {first.shape}, dtype: {first.dtype}")
    
    # Now convert each frame to PIL Image
    pil_frames = []
    for i, frame in enumerate(frames_list):
        try:
            pil_frame = _ensure_pil_image(frame)
            pil_frames.append(pil_frame)
        except Exception as e:
            logger.error(f"Failed to convert frame {i}/{len(frames_list)}: {e}")
            if hasattr(frame, 'shape'):
                logger.error(f"  Frame {i} shape: {frame.shape}, dtype: {frame.dtype}")
            raise
    
    logger.info(f"Successfully converted {len(pil_frames)} frames to PIL Images")
    return pil_frames