import time
from fastapi import FastAPI, Depends, HTTPException, Request
from pydantic import BaseModel

from .core.config import settings, initialize_application
from .core.security import setup_security_middleware, api_key_dependency
from .utils.hardware import get_hardware_info, estimate_performance
from fastapi import Body
from pydantic import BaseModel
from pathlib import Path
import json
from typing import Optional, List
from fastapi.responses import FileResponse

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
        # For local mode, we will pass the repo via hf_model_repo if provided by UI,
        # while local_model_key can hint which preset was chosen.
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
    status = generator.generation_status.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.get("/videos")
async def list_videos():
    return storage.list_videos()


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
        fps = video.get('params', {}).get('fps', 8)
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
async def local_model_status(repo_id: str):
    """
    Check if a local model is downloaded and provide basic info.
    """
    try:
        return model_registry.model_info(repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LocalModelDownloadRequest(BaseModel):
    repo_id: str


@app.post("/models/local/download")
async def local_model_download(req: LocalModelDownloadRequest):
    """
    Download a model snapshot into the local models directory.
    """
    try:
        info = model_registry.ensure_downloaded(req.repo_id)
        return {"ok": True, "model": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {e}")


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
