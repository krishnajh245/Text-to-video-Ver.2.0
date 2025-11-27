import time
import json
import os
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Request, Body, Query
from pydantic import BaseModel
from fastapi.responses import FileResponse

from .core.config import settings, initialize_application
from .core.security import setup_security_middleware, api_key_dependency
from .utils.hardware import get_hardware_info, estimate_performance

from .services.storage import get_video_storage
from .services.generator import get_video_generator
from .services.models import get_local_model_registry

# Initialize
initialize_application()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs",
)

setup_security_middleware(app, settings)


class HealthResponse(BaseModel):
    status: str
    message: str
    version: str
    environment: str
    timestamp: float


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        message=f"{settings.app_name} is running",
        version=settings.app_version,
        environment=settings.environment,
        timestamp=time.time(),
    )


@app.get("/hardware")
async def hardware():
    return get_hardware_info()


@app.get("/performance")
async def performance():
    return estimate_performance()


@app.get("/secure-check")
async def secure_check(_=Depends(api_key_dependency)):
    return {"ok": True}


class GenerateRequest(BaseModel):
    prompt: str
    num_frames: int = 24
    fps: int = 8
    width: int = 512
    height: int = 512
    use_hf_api: bool = True
    hf_token: Optional[str] = None
    hf_model_repo: Optional[str] = None
    local_model_key: Optional[str] = None
    negative_prompt: Optional[str] = None
    num_inference_steps: int = 50
    guidance_scale: float = 7.5
    seed: Optional[int] = None


storage = get_video_storage()
generator = get_video_generator(storage)
model_registry = get_local_model_registry()


@app.post("/generate")
async def generate(req: GenerateRequest = Body(...)):
    if req.use_hf_api and not req.hf_token:
        raise HTTPException(status_code=400, detail="Hugging Face token required for cloud generation")
    result = generator.generate_video(
        prompt=req.prompt,
        num_frames=req.num_frames,
        fps=req.fps,
        width=req.width,
        height=req.height,
        use_hf_api=req.use_hf_api,
        hf_token=req.hf_token,
        hf_model_repo=req.hf_model_repo,
        # local_model_key indicates a specific local preset (e.g. zeroscope-local).
        local_model_key=req.local_model_key,
        negative_prompt=req.negative_prompt,
        num_inference_steps=req.num_inference_steps,
        guidance_scale=req.guidance_scale,
        seed=req.seed,
    )
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to start generation")
    return result


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    with generator._status_lock:
        status = generator.generation_status.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.get("/videos")
async def list_videos():
    """List only videos that actually have a folder and either frames or an output.mp4 file.

    This avoids returning stale metadata entries for jobs that never produced files,
    which would cause 404s when the frontend requests /videos/{id}/output.mp4.
    """
    videos = storage.list_videos()
    existing: list[dict] = []
    base = Path(storage.storage_base_path)
    for v in videos:
        vid = v.get("id") if isinstance(v, dict) else None
        if not vid:
            continue
        video_dir = base / str(vid)
        if not video_dir.exists():
            continue
        output = video_dir / "output.mp4"
        has_output = output.exists()
        has_frames = any(video_dir.glob("frame_*.png"))
        if has_output or has_frames:
            existing.append(v)
    return existing


@app.get("/videos/{video_id}")
async def get_video_metadata(video_id: str):
    video = storage.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@app.delete("/videos/{video_id}")
async def delete_video(video_id: str):
    if not storage.delete_video(video_id):
        raise HTTPException(status_code=404, detail="Video not found or already deleted")
    return {"ok": True, "id": video_id}


@app.get("/videos/{video_id}/output.mp4")
async def serve_video_file(video_id: str):
    video = storage.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    video_dir = Path(storage.storage_base_path) / video_id
    output = video_dir / "output.mp4"
    if not output.exists():
        # attempt create from frames
        frame_files = sorted(video_dir.glob("frame_*.png"))
        if not frame_files:
            raise HTTPException(status_code=404, detail="No frames found for this video")
        frames = []
        from PIL import Image
        for f in frame_files:
            try:
                frames.append(Image.open(f))
            except Exception:
                continue
        params = video.get('params') or {}
        fps = params.get('fps', 8)
        if not storage._create_video_file(video_dir, frames, fps):
            raise HTTPException(status_code=500, detail="Failed to create video file")
    if not output.exists():
        raise HTTPException(status_code=404, detail="Video file unavailable")
    return FileResponse(path=str(output), media_type="video/mp4", filename=f"video_{video_id}.mp4")


@app.get("/videos/{video_id}/thumbnail.jpg")
async def serve_thumbnail(video_id: str):
    video = storage.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    video_dir = Path(storage.storage_base_path) / video_id
    thumb = video_dir / "thumbnail.jpg"
    if not thumb.exists():
        try:
            if not storage._create_thumbnail(video_dir):
                from PIL import Image
                Image.new('RGB', (300, 200), color='gray').save(thumb, "JPEG", quality=85)
        except Exception:
            from PIL import Image
            Image.new('RGB', (300, 200), color='gray').save(thumb, "JPEG", quality=85)
    if not thumb.exists():
        raise HTTPException(status_code=404, detail="Thumbnail unavailable")
    return FileResponse(path=str(thumb), media_type="image/jpeg", filename=f"thumbnail_{video_id}.jpg")


@app.get("/models/supported")
async def supported_models():
    # Curated list including user-provided popular repos
    return {
        "models": [
            "meituan-longcat/LongCat-Video",
            "krea/krea-realtime-video",
            "QuantStack/Wan2.2-T2V-A14B-GGUF",
            "Wan-AI/Wan2.2-TI2V-5B",
            "hpcai-tech/Open-Sora-v2",
            "Wan-AI/Wan2.2-T2V-A14B",
            "lightx2v/Wan2.2-Lightning",
            "alibaba-pai/Wan2.2-Fun-Reward-LoRAs",
            "BAAI/URSA-1.7B-FSQ320",
            "tencent/HunyuanVideo",
            "Wan-AI/Wan2.1-T2V-14B",
            "genmo/mochi-1-preview",
            "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
            "Skywork/SkyReels-V2-DF-14B-720P",
            "vrgamedevgirl84/Wan14BT2VFusioniX",
            "Wan-AI/Wan2.2-T2V-A14B-Diffusers",
            "Wan-AI/Wan2.1-T2V-1.3B",
            "calcuis/wan-gguf",
            "QuantStack/Wan2.1_14B_VACE-GGUF",
            "Wan-AI/Wan2.2-TI2V-5B-Diffusers",
            "QuantStack/Wan2.2-TI2V-5B-GGUF",
            "bullerwins/Wan2.2-T2V-A14B-GGUF",
            "Cseti/wan2.2-14B-Kinestasis_concept-lora-v1",
            "akhaliq/sora-2",
            "akhaliq/veo3.1-fast",
            "TencentARC/RollingForcing",
            "QuantStack/HoloCine-GGUF",
            "ali-vilab/modelscope-damo-text-to-video-synthesis",
            "ali-vilab/i2vgen-xl",
            "damo-vilab/text-to-video-ms-1.7b",
        ]
    }


@app.get("/models/trending")
async def trending_models():
    # Simple proxy to HF public API for text-to-video trending by downloads
    try:
        import httpx
        params = {
            "pipeline_tag": "text-to-video",
            "sort": "downloads",
            "direction": "-1",
            "limit": 30,
        }
        r = httpx.get("https://huggingface.co/api/models", params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        # Return compact fields
        models = [
            {
                "id": m.get("id"),
                "likes": m.get("likes"),
                "downloads": m.get("downloads") or m.get("downloadsAllTime"),
                "tags": m.get("tags"),
                "updatedAt": m.get("lastModified"),
            }
            for m in data
        ]
        return {"models": models}
    except Exception as e:
        return {"models": [], "error": str(e)}


@app.get("/models/local/status")
async def local_model_status(repo_id: str = Query(..., description="Model repository ID")):
    """
    Check if a local model is downloaded and provide basic info.
    """
    try:
        return model_registry.model_info(repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LocalModelDownloadRequest(BaseModel):
    repo_id: str
    hf_token: Optional[str] = None


@app.post("/models/local/download")
async def local_model_download(req: LocalModelDownloadRequest):
    """
    Start downloading a model snapshot into the local models directory.
    Returns a download_id for progress tracking.
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Starting download request for {req.repo_id}")
        
        # Check if already downloaded
        if model_registry.is_downloaded(req.repo_id):
            info = model_registry.model_info(req.repo_id)
            logger.info(f"Model {req.repo_id} already downloaded")
            return {
                "ok": True, 
                "download_id": None,
                "repo_id": req.repo_id,
                "already_downloaded": True,
                "model": info
            }
        
        # Validate token if provided
        if req.hf_token:
            import requests
            headers = {"Authorization": f"Bearer {req.hf_token}"}
            r = requests.get("https://huggingface.co/api/whoami-v2", headers=headers, timeout=10)
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Hugging Face token")
            logger.info("HF token validated successfully")
        
        download_id = model_registry.start_download(req.repo_id, req.hf_token)
        logger.info(f"Download started with ID: {download_id}")
        return {"ok": True, "download_id": download_id, "repo_id": req.repo_id}
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Download request failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@app.get("/models/local/download/{download_id}/progress")
async def get_download_progress(download_id: str):
    """
    Get download progress for a specific download_id.
    Also supports querying by repo_id if download_id not found.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        progress = model_registry.get_download_progress(download_id)
        
        # If not found, try to find by repo_id (in case download_id format changed)
        if not progress:
            # Check if download_id might be a repo_id
            progress = model_registry.get_download_progress_by_repo(download_id)
            if progress:
                logger.info(f"Found progress by repo_id: {download_id}")
        
        if not progress:
            # Log all available download IDs for debugging
            try:
                with model_registry._progress_lock:
                    available_ids = list(model_registry.download_progress.keys())
                logger.warning(f"Download progress not found for ID: {download_id}. Available IDs: {available_ids[:5]}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"Download not found: {download_id}. Available downloads: {len(available_ids)}"
                )
            except (AttributeError, Exception) as e:
                # Fallback if lock access fails
                logger.warning(f"Download progress not found for ID: {download_id}. Error: {e}")
                raise HTTPException(status_code=404, detail=f"Download not found: {download_id}")
        
        logger.debug(f"Progress for {download_id}: {progress.get('status')} - {progress.get('message')}")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting download progress: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting progress: {str(e)}")


@app.get("/models/local/debug")
async def debug_models():
    """
    Debug endpoint to check model registry status.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        base_dir = model_registry.base_dir
        active_downloads = model_registry.list_active_downloads()
        return {
            "base_dir": str(base_dir),
            "exists": base_dir.exists(),
            "writable": os.access(base_dir, os.W_OK) if base_dir.exists() else False,
            "models_dir_contents": [str(p.name) for p in base_dir.iterdir()] if base_dir.exists() else [],
            "active_downloads": {
                did: {
                    "repo_id": prog.get("repo_id"),
                    "status": prog.get("status"),
                    "progress": prog.get("progress"),
                    "message": prog.get("message")
                }
                for did, prog in active_downloads.items()
            },
            "active_download_count": len(active_downloads)
        }
    except Exception as e:
        logger.error(f"Debug error: {e}", exc_info=True)
        return {"error": str(e)}


class HFApiTestRequest(BaseModel):
    hf_token: str


@app.post("/hf-validate")
async def validate_hf_token(req: HFApiTestRequest):
    try:
        import requests
        headers = {"Authorization": f"Bearer {req.hf_token}"}
        r = requests.get("https://huggingface.co/api/whoami-v2", headers=headers, timeout=10)
        if r.status_code == 200:
            return {"valid": True, "message": "Token is valid"}
        if r.status_code == 401:
            return {"valid": False, "message": "Invalid token: Unauthorized"}
        if r.status_code == 403:
            return {"valid": False, "message": "Invalid token: Forbidden"}
        return {"valid": False, "message": f"Invalid token: {r.status_code}"}
    except Exception as e:
        return {"valid": False, "message": f"Validation failed: {e}"}
