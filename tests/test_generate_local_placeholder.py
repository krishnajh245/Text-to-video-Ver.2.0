import sys
import time
from fastapi.testclient import TestClient

sys.path.append('.')
from backend.app.main import app  # noqa: E402

client = TestClient(app)


def test_generate_local_placeholder_completes():
    payload = {
        "prompt": "A neon city skyline with flying cars at night",
        "num_frames": 6,
        "fps": 8,
        "width": 256,
        "height": 256,
        "use_hf_api": False,
        "num_inference_steps": 5,
        "guidance_scale": 7.5,
    }
    r = client.post("/generate", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "job_id" in data
    job_id = data["job_id"]

    # Poll briefly for completion (placeholder path should be fast)
    for _ in range(30):
        s = client.get(f"/status/{job_id}")
        assert s.status_code == 200
        status = s.json()
        if status.get("status") == "completed":
            assert status.get("progress") == 100
            assert status.get("video_id")
            return
        if status.get("status") == "failed":
            raise AssertionError(f"Generation failed: {status}")
        time.sleep(0.1)

    raise AssertionError("Generation did not complete in time")


