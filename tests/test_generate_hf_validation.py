import sys
import time
from fastapi.testclient import TestClient

sys.path.append('.')
from backend.app.main import app  # noqa: E402

client = TestClient(app)


def test_generate_requires_hf_token_when_enabled():
    payload = {
        "prompt": "A short cinematic scene of the ocean at sunrise",
        "num_frames": 8,
        "fps": 8,
        "width": 256,
        "height": 256,
        "use_hf_api": True,
        "num_inference_steps": 5,
        "guidance_scale": 7.5,
    }
    r = client.post("/generate", json=payload)
    assert r.status_code == 400
    data = r.json()
    assert "Hugging Face token" in (data.get("detail") or "")


