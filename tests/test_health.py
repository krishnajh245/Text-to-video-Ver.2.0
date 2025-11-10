import sys
from fastapi.testclient import TestClient

sys.path.append('.')
from backend.app.main import app  # noqa: E402

client = TestClient(app)

def test_health():
    r = client.get('/health')
    assert r.status_code == 200
    data = r.json()
    assert data['status'] == 'healthy'
    assert 'version' in data


def test_hardware():
    r = client.get('/hardware')
    assert r.status_code == 200
    data = r.json()
    assert 'cpu' in data
