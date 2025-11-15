import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Optional

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

from ..core.config import settings
from .models import get_local_model_registry
from .local_pipelines import generate_local_video, resolve_local_repo_id

logger = logging.getLogger(__name__)


class VideoGenerator:
    def __init__(self, video_storage):
        self.video_storage = video_storage
        self.hf_token: str | None = None
        self.generation_status: dict[str, dict[str, Any]] = {}
        self._status_lock = threading.Lock()
        # Local model registry is used lazily when a local model is requested.
        self._model_registry = get_local_model_registry()

    def set_hf_token(self, token: str) -> None:
        self.hf_token = token

    def _update_generation_status(self, job_id: str, **kwargs) -> None:
        with self._status_lock:
            status = self.generation_status.get(job_id, {})
            status.update(kwargs)
            self.generation_status[job_id] = status

    def generate_video(
        self,
        prompt: str,
        num_frames: int = 60,
        fps: int = 24,
        width: int = 832,
        height: int = 480,
        use_hf_api: bool = True,
        hf_token: str | None = None,
        hf_model_repo: str | None = None,
        negative_prompt: str | None = None,
        num_inference_steps: int = 50,
        guidance_scale: float = 7.5,
        seed: int | None = None,
        local_model_key: str | None = None,
    ) -> dict:
        job_id = str(uuid.uuid4())
        if not prompt or not prompt.strip():
            self._update_generation_status(job_id, status="failed", error="Empty prompt")
            return {"job_id": job_id, "status": "failed"}

        width = (max(128, min(width, 1920)) // 8) * 8
        height = (max(128, min(height, 1080)) // 8) * 8
        num_frames = max(1, min(num_frames, 120))
        fps = max(1, min(fps, 60))

        params = {
            "prompt": prompt,
            "num_frames": num_frames,
            "fps": fps,
            "width": width,
            "height": height,
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale,
            "negative_prompt": negative_prompt,
            "seed": seed,
            "local_model_key": local_model_key,
            "hf_model_repo": hf_model_repo,
            "use_hf_api": use_hf_api,
        }

        meta = self.video_storage.create_video_entry(params)
        if not meta:
            self._update_generation_status(job_id, status="failed", error="storage init failed")
            return {"job_id": job_id, "status": "failed"}

        video_id = meta["id"]
        self._update_generation_status(
            job_id,
            status="pending",
            progress=0,
            video_id=video_id,
            message="Queued for processing"
        )

        thread = threading.Thread(
            target=self._generate_thread,
            args=(
                job_id,
                video_id,
                prompt,
                num_frames,
                fps,
                width,
                height,
                use_hf_api,
                hf_token,
                hf_model_repo,
                negative_prompt,
                num_inference_steps,
                guidance_scale,
                seed,
                local_model_key,
            ),
        )
        thread.start()

        return {"job_id": job_id, "status": "pending", "video_id": video_id}

    def _generate_thread(
        self,
        job_id: str,
        video_id: str,
        prompt: str,
        num_frames: int,
        fps: int,
        width: int,
        height: int,
        use_hf_api: bool,
        hf_token: str | None,
        hf_model_repo: str | None,
        negative_prompt: str | None,
        num_inference_steps: int,
        guidance_scale: float,
        seed: int | None,
        local_model_key: str | None,
    ) -> None:
        started = time.time()
        try:
            self._update_generation_status(job_id, status="processing", progress=10, message="Preparing request")

            frames = None
            local_error: Optional[str] = None

            # 1) Try local model first when requested.
            if local_model_key:
                try:
                    self._update_generation_status(
                        job_id,
                        progress=20,
                        message="Loading local model",
                    )
                    frames = self._generate_with_local_model(
                        local_model_key,
                        prompt,
                        num_frames,
                        width,
                        height,
                        negative_prompt,
                        num_inference_steps,
                        guidance_scale,
                        seed,
                    )
                except Exception as e:
                    local_error = str(e)
                    logger.error("Local generation failed for %s: %s", local_model_key, e, exc_info=True)

            # 2) If no frames yet, and HF is enabled, fall back to HF API.
            if frames is None and use_hf_api:
                if local_model_key and local_error:
                    self._update_generation_status(
                        job_id,
                        progress=30,
                        message="Local model unavailable, falling back to Hugging Face",
                    )
                else:
                    self._update_generation_status(job_id, progress=30, message="Contacting Hugging Face Inference API")

                result = self._generate_with_hf_api(
                    prompt,
                    num_frames,
                    width,
                    height,
                    hf_token or self.hf_token,
                    negative_prompt,
                    num_inference_steps,
                    guidance_scale,
                    seed,
                    model_repo=hf_model_repo,
                )
                if isinstance(result, dict) and "video_bytes" in result:
                    # Save video bytes and extract frames
                    self._update_generation_status(job_id, progress=60, message="Downloading and saving video")
                    video_dir = Path(self.video_storage.storage_base_path) / video_id
                    video_dir.mkdir(parents=True, exist_ok=True)
                    if not self.video_storage.save_video_bytes(video_dir, result["video_bytes"]):
                        raise RuntimeError("Failed to save video file from HF response")
                    self._update_generation_status(job_id, progress=75, message="Extracting frames")
                    saved_frames = self.video_storage.extract_frames_from_video(video_dir, fps)
                    frames = None  # Explicitly indicate we already saved frames
                else:
                    # Some models may return an image sequence instead of a video
                    self._update_generation_status(job_id, progress=55, message="Processing frames from API")
                    frames = result

            # 3) If still no frames and no HF allowed, either bubble local error or use placeholder.
            if frames is None and not use_hf_api:
                if local_error:
                    raise RuntimeError(local_error)
                # Fallback to placeholder motion to keep pipeline functional.
                self._update_generation_status(job_id, progress=30, message="Using placeholder local generator")
                frames = self._create_placeholder_frames(width, height, num_frames, prompt)

            if frames is None:
                # Frames already extracted from saved video
                video_meta = self.video_storage.get_video(video_id)
                saved = video_meta.get("frame_count", 0) if video_meta else 0
                if not saved:
                    # If not updated yet, try to count on disk
                    video_dir = Path(self.video_storage.storage_base_path) / video_id
                    saved = len(sorted(video_dir.glob("frame_*.png")))
            else:
                if not isinstance(frames, list) or len(frames) == 0:
                    raise RuntimeError("No frames generated")
                self._update_generation_status(job_id, status="processing", progress=80, message="Saving frames")
                saved = self._save_frames(video_id, frames)

            # Persist frame count
            try:
                self.video_storage.update_video_frames(video_id, int(saved or 0))
            except Exception:
                pass

            elapsed = time.time() - started
            self._update_generation_status(job_id, status="completed", progress=100, message="Completed", elapsed_seconds=elapsed)
        except Exception as e:
            elapsed = time.time() - started
            self._update_generation_status(job_id, status="failed", error=str(e), message="Failed", elapsed_seconds=elapsed)

    def _generate_with_hf_api(
        self,
        prompt: str,
        num_frames: int,
        width: int,
        height: int,
        token: str | None,
        negative_prompt: str | None,
        num_inference_steps: int,
        guidance_scale: float,
        seed: int | None,
        model_repo: str | None = None,
    ):
        if not token or not token.startswith("hf_"):
            raise ValueError("Invalid Hugging Face API token")
        import requests
        repo = (model_repo or settings.hf_model_repo).strip()
        # Prefer new Inference Providers router root endpoint with model via header
        ROOT_URL = "https://router.huggingface.co/hf-inference"
        MODELS_URL = f"https://router.huggingface.co/hf-inference/models/{repo}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "video/mp4, application/octet-stream, application/json",
            "X-Requested-Model": repo,
        }
        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt or "blurry, low quality, noisy",
                "height": min(height, 576),
                "width": min(width, 1024),
                "num_inference_steps": min(num_inference_steps, 50),
                "guidance_scale": guidance_scale,
                "num_frames": max(8, num_frames),
                "fps": 8,
                "seed": seed,
            },
            "options": {"use_cache": True, "wait_for_model": True},
        }

        def _attempt(url: str, use_root: bool) -> dict | None:
            h = dict(headers)
            if not use_root:
                # When addressing model path directly, drop X-Requested-Model
                h.pop("X-Requested-Model", None)
            resp = requests.post(url, headers=h, json=payload, timeout=settings.hf_timeout_seconds)
            # Try to parse JSON error bodies
            ctype = resp.headers.get('content-type', '')
            if resp.status_code == 200 and (ctype.startswith('video') or ctype.startswith('application/octet-stream')):
                return {"video_bytes": resp.content}
            try:
                js = resp.json()
                if isinstance(js, dict) and js.get('error'):
                    raise RuntimeError(f"HF API error: {resp.status_code}: {js.get('error')}")
            except Exception:
                pass
            if resp.status_code == 404:
                return None
            raise RuntimeError(f"HF API error: {resp.status_code}: {resp.text[:200]}")

        # Try root endpoint first, then model-specific path as fallback
        out = _attempt(ROOT_URL, use_root=True)
        if out is None:
            out = _attempt(MODELS_URL, use_root=False)
            if out is None:
                raise RuntimeError("HF API error: 404: Not Found (both router root and model endpoints)")
        return out

    def _create_placeholder_frames(self, width: int, height: int, num_frames: int, prompt: str) -> list[np.ndarray]:
        """
        Create simple motion frames locally as a graceful fallback when no local T2V model is installed.
        Uses a base image synthesized from the prompt text and applies subtle camera and flow motion.
        """
        # Create a basic base image with prompt text
        base = Image.new('RGB', (width, height), color=(10, 10, 15))
        try:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(base)
            text = (prompt or "AI Video").strip()[:60]
            # Try to load a common font; fallback to default
            try:
                font = ImageFont.truetype("arial.ttf", size=max(18, min(width, height)//18))
            except Exception:
                font = ImageFont.load_default()
            tw, th = draw.textbbox((0, 0), text, font=font)[2:]
            draw.text(((width - tw)//2, (height - th)//2), text, fill=(139, 92, 246), font=font)
        except Exception:
            pass
        base = self._enhance_image(base)
        frames = self._create_motion_from_base(base, num_frames)
        return frames

    def _generate_with_local_model(
        self,
        local_model_key: str,
        prompt: str,
        num_frames: int,
        width: int,
        height: int,
        negative_prompt: str | None,
        num_inference_steps: int,
        guidance_scale: float,
        seed: int | None,
    ):
        """Generate frames using a real local text-to-video model.

        This uses the LocalModelRegistry to locate the downloaded model on disk,
        then runs the appropriate diffusers pipeline via `generate_local_video`.
        """
        repo_id = resolve_local_repo_id(local_model_key)
        if not repo_id:
            raise RuntimeError(f"Unknown local model key: {local_model_key}")

        registry = self._model_registry
        info = registry.model_info(repo_id)
        if not info.get("downloaded"):
            raise RuntimeError(
                f"Local model '{repo_id}' is not downloaded. Trigger a download from the UI before using it."
            )

        model_path = info.get("path")
        if not model_path:
            raise RuntimeError(f"Local model path not recorded for repo '{repo_id}'.")

        model_dir = Path(model_path)
        if not model_dir.exists():
            raise RuntimeError(f"Local model directory does not exist on disk: {model_dir}")

        return generate_local_video(
            model_key=local_model_key,
            repo_dir=model_dir,
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=num_frames,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
        )

    def _enhance_image(self, image: Image.Image) -> Image.Image:
        try:
            image = ImageEnhance.Contrast(image).enhance(1.08)
            image = ImageEnhance.Brightness(image).enhance(1.03)
            image = ImageEnhance.Sharpness(image).enhance(1.08)
            image = ImageEnhance.Color(image).enhance(1.02)
            return image
        except Exception:
            return image

    def _create_motion_from_base(self, base_image: Image.Image, num_frames: int) -> list[np.ndarray]:
        import cv2
        rng = np.random.default_rng()
        base = np.array(base_image).astype(np.float32)
        h, w = base.shape[:2]
        frames: list[np.ndarray] = []

        # Precompute gentle per-pixel displacement field (Perlin-like noise)
        noise_scale = 0.005
        yy, xx = np.mgrid[0:h, 0:w]
        noise_phase = rng.random() * 2 * np.pi
        disp_x = (np.sin(xx * noise_scale + noise_phase) * np.cos(yy * noise_scale * 1.3 + noise_phase)).astype(np.float32)
        disp_y = (np.cos(xx * noise_scale * 0.9 + noise_phase) * np.sin(yy * noise_scale + noise_phase)).astype(np.float32)

        for i in range(num_frames):
            t = i / max(1, num_frames - 1)

            # Camera motion parameters (subpixel translations, small zoom and rotation)
            tx = 2.0 * np.cos(2 * np.pi * t)  # pixels
            ty = 2.0 * np.sin(2 * np.pi * t)
            zoom = 1.0 + 0.01 * np.sin(2 * np.pi * t)
            angle = 1.5 * np.sin(2 * np.pi * t + np.pi / 4.0)  # degrees

            # Build affine transform: scale -> rotate -> translate
            center = (w / 2.0, h / 2.0)
            M = cv2.getRotationMatrix2D(center, angle, zoom)
            M[0, 2] += tx
            M[1, 2] += ty

            warped = cv2.warpAffine(base, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

            # Time-varying subtle displacement (flow) to avoid strictly rigid motion
            flow_strength = 0.6
            fx = disp_x * flow_strength * np.sin(2 * np.pi * (t + 0.15))
            fy = disp_y * flow_strength * np.cos(2 * np.pi * (t + 0.3))
            map_x = (xx + fx).astype(np.float32)
            map_y = (yy + fy).astype(np.float32)
            flowed = cv2.remap(warped, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

            # Subtle exposure/temperature changes for liveliness
            exposure = 1.0 + 0.03 * np.sin(2 * np.pi * (t + 0.1))
            temp = 1.0 + 0.02 * np.cos(2 * np.pi * (t + 0.2))
            frame = flowed.copy()
            frame = np.clip(frame * exposure, 0, 255)
            # apply simple white-balance-like shift
            if frame.ndim == 3 and frame.shape[2] >= 3:
                frame[..., 0] *= 1.0  # R
                frame[..., 1] *= (0.995 + 0.01 * (2 - temp))  # G
                frame[..., 2] *= (1.0 * temp)  # B

            # Add tiny film-grain noise
            noise = rng.normal(0, 0.75, size=frame.shape).astype(np.float32)
            frame = np.clip(frame + noise, 0, 255).astype(np.uint8)

            frames.append(frame)

        return frames

    def _save_frames(self, video_id: str, frames) -> int:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        video_dir = Path(self.video_storage.storage_base_path) / video_id
        video_dir.mkdir(parents=True, exist_ok=True)

        def save_one(i: int, arr) -> bool:
            try:
                if hasattr(arr, 'numpy'):
                    arr = arr.numpy()
                if not isinstance(arr, Image.Image):
                    try:
                        arr = np.ascontiguousarray(arr)
                    except Exception:
                        pass
                    img = Image.fromarray(arr)
                else:
                    img = arr
                img.save(video_dir / f"frame_{i:04d}.png")
                return True
            except Exception as e:
                logger.error(f"Error saving frame {i}: {e}")
                return False

        saved = 0
        with ThreadPoolExecutor(max_workers=min(8, len(frames) or 1)) as ex:
            futures = [ex.submit(save_one, i, f) for i, f in enumerate(frames)]
            for fut in as_completed(futures):
                try:
                    if fut.result():
                        saved += 1
                except Exception:
                    pass

        try:
            self.video_storage._create_thumbnail(video_dir)
        except Exception:
            pass
        try:
            meta = self.video_storage.get_video(video_id) or {}
            params = meta.get('params') or {}
            fps = params.get('fps', 8)
            # Only stitch video if we actually saved frames
            # Pass None to let _create_video_file check for frame files on disk
            if saved > 0:
                self.video_storage._create_video_file(video_dir, None, fps)
        except Exception as e:
            logger.error(f"Error creating video file: {e}")
        return saved


def get_video_generator(video_storage) -> VideoGenerator:
    return VideoGenerator(video_storage)


