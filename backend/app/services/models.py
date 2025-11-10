import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

DEFAULT_MODELS_DIR = Path.cwd() / "video-gen-models"


class LocalModelRegistry:
    """
    Minimal local model registry to check/download models needed for local generation.
    This does not load into memory; it only manages local presence on disk.
    """
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir) if base_dir else DEFAULT_MODELS_DIR
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _model_dir(self, repo_id: str) -> Path:
        safe = repo_id.replace("/", "__")
        return self.base_dir / safe

    def is_downloaded(self, repo_id: str) -> bool:
        model_dir = self._model_dir(repo_id)
        idx = model_dir / "model_index.json"
        return idx.exists()

    def model_info(self, repo_id: str) -> Dict[str, Any]:
        model_dir = self._model_dir(repo_id)
        size_bytes = 0
        if model_dir.exists():
            for root, _, files in os.walk(model_dir):
                for f in files:
                    try:
                        size_bytes += os.path.getsize(os.path.join(root, f))
                    except Exception:
                        pass
        return {
            "repo_id": repo_id,
            "downloaded": self.is_downloaded(repo_id),
            "path": str(model_dir),
            "size_bytes": size_bytes,
        }

    def ensure_downloaded(self, repo_id: str) -> Dict[str, Any]:
        """
        Download model snapshot using huggingface_hub if not present.
        """
        if self.is_downloaded(repo_id):
            return self.model_info(repo_id)
        try:
            from huggingface_hub import snapshot_download
            target_dir = self._model_dir(repo_id)
            snapshot_download(repo_id=repo_id, local_dir=str(target_dir), local_dir_use_symlinks=False)
            return self.model_info(repo_id)
        except Exception as e:
            logger.error(f"Failed to download model {repo_id}: {e}")
            raise


_registry: Optional[LocalModelRegistry] = None


def get_local_model_registry() -> LocalModelRegistry:
    global _registry
    if _registry is None:
        _registry = LocalModelRegistry()
    return _registry


