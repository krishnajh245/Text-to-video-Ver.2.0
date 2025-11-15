import logging
import os
import time
import threading
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
        self.download_progress: dict[str, dict[str, Any]] = {}
        self._progress_lock = threading.Lock()

    def _model_dir(self, repo_id: str) -> Path:
        safe = repo_id.replace("/", "__")
        return self.base_dir / safe

    def is_downloaded(self, repo_id: str) -> bool:
        """
        Check if model is downloaded by looking for any files in the model directory.
        More lenient check - just needs to have some files.
        """
        model_dir = self._model_dir(repo_id)
        if not model_dir.exists():
            return False
        # Check if directory has any files (not just empty)
        try:
            files = list(model_dir.rglob("*"))
            # Filter out directories and hidden files
            files = [f for f in files if f.is_file() and not f.name.startswith('.')]
            return len(files) > 0
        except Exception:
            return False

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

    def start_download(self, repo_id: str, token: Optional[str] = None) -> str:
        """
        Start model download in background thread and return download_id.
        Uses file system monitoring for progress tracking.
        """
        # Sanitize repo_id for use in download_id (remove slashes)
        safe_repo_id = repo_id.replace("/", "__").replace("\\", "__")
        download_id = f"{safe_repo_id}_{int(time.time() * 1000)}"
        target_dir = self._model_dir(repo_id)
        
        logger.info(f"Starting download: repo_id={repo_id}, download_id={download_id}")
        
        with self._progress_lock:
            self.download_progress[download_id] = {
                "repo_id": repo_id,
                "status": "downloading",
                "progress": 0,
                "message": "Starting download...",
                "downloaded": 0,
                "total": 0
            }
        
        def download_thread():
            try:
                from huggingface_hub import snapshot_download
                import os
                
                # Ensure target directory exists
                target_dir.mkdir(parents=True, exist_ok=True)
                
                # Get initial size if directory exists
                initial_size = 0
                if target_dir.exists():
                    for root, _, files in os.walk(target_dir):
                        for f in files:
                            try:
                                initial_size += os.path.getsize(os.path.join(root, f))
                            except Exception:
                                pass
                
                with self._progress_lock:
                    self.download_progress[download_id].update({
                        "progress": 5,
                        "message": "Connecting to Hugging Face..."
                    })
                
                logger.info(f"Starting download of {repo_id} to {target_dir}")
                
                # Start download in a separate process-like approach
                # We'll monitor file system changes for progress
                def update_progress():
                    """Monitor download progress by checking file sizes"""
                    last_size = initial_size
                    check_count = 0
                    while True:
                        time.sleep(2)  # Check every 2 seconds
                        check_count += 1
                        
                        with self._progress_lock:
                            current_status = self.download_progress.get(download_id)
                            if not current_status or current_status.get("status") != "downloading":
                                break
                        
                        # Calculate current size
                        current_size = initial_size
                        file_count = 0
                        try:
                            if target_dir.exists():
                                for root, _, files in os.walk(target_dir):
                                    for f in files:
                                        try:
                                            current_size += os.path.getsize(os.path.join(root, f))
                                            file_count += 1
                                        except Exception:
                                            pass
                        except Exception:
                            pass
                        
                        # Estimate progress (we don't know total, so use heuristic)
                        if current_size > last_size:
                            # Progress based on time and file growth
                            # Assume download takes 5-10 minutes for large models
                            estimated_progress = min(95, 10 + (check_count * 2))
                            
                            with self._progress_lock:
                                if download_id in self.download_progress:
                                    self.download_progress[download_id].update({
                                        "progress": estimated_progress,
                                        "downloaded": current_size,
                                        "message": f"Downloading... {file_count} files, {current_size / (1024*1024):.1f} MB"
                                    })
                            last_size = current_size
                
                # Start progress monitor
                progress_thread = threading.Thread(target=update_progress, daemon=True)
                progress_thread.start()
                
                # Update progress before download
                with self._progress_lock:
                    if download_id in self.download_progress:
                        self.download_progress[download_id].update({
                            "progress": 10,
                            "message": f"Downloading {repo_id}..."
                        })
                
                # Download with token if provided
                try:
                    snapshot_download(
                        repo_id=repo_id,
                        local_dir=str(target_dir),
                        local_dir_use_symlinks=False,
                        token=token if token else None,
                        resume_download=True,
                        # Skip only markdown and git metadata; keep .txt files such as tokenizer merges.
                        ignore_patterns=["*.md", "*.git*"]
                    )
                except Exception as download_error:
                    logger.error(f"snapshot_download failed for {repo_id}: {download_error}")
                    raise
                
                logger.info(f"Download completed for {repo_id}, verifying files...")
                
                # Wait a moment for file system to sync
                time.sleep(1)
                
                # Verify download completed
                final_size = 0
                final_file_count = 0
                if target_dir.exists():
                    for root, _, files in os.walk(target_dir):
                        for f in files:
                            try:
                                file_path = os.path.join(root, f)
                                if os.path.exists(file_path):
                                    final_size += os.path.getsize(file_path)
                                    final_file_count += 1
                            except Exception as e:
                                logger.warning(f"Error checking file {f}: {e}")
                                pass
                
                if final_file_count == 0:
                    raise RuntimeError(f"Download completed but no files found in {target_dir}")
                
                logger.info(f"Verified: {final_file_count} files, {final_size / (1024*1024):.1f} MB")
                
                # Mark as complete
                with self._progress_lock:
                    if download_id in self.download_progress:
                        self.download_progress[download_id].update({
                            "status": "completed",
                            "progress": 100,
                            "message": f"Download completed ({final_file_count} files, {final_size / (1024*1024):.1f} MB)",
                            "downloaded": final_size,
                            "total": final_size
                        })
                    
            except Exception as e:
                error_msg = str(e)
                import traceback
                full_traceback = traceback.format_exc()
                logger.error(f"Failed to download model {repo_id}: {error_msg}\n{full_traceback}")
                
                # Extract more detailed error information
                error_details = error_msg
                if "401" in error_msg or "Unauthorized" in error_msg:
                    error_details = "Authentication failed. Please check your Hugging Face token."
                elif "404" in error_msg or "Not Found" in error_msg:
                    error_details = f"Model repository '{repo_id}' not found. Please check the repository ID."
                elif "Connection" in error_msg or "timeout" in error_msg.lower():
                    error_details = "Network connection error. Please check your internet connection."
                elif "Permission" in error_msg or "permission" in error_msg.lower():
                    error_details = f"Permission denied. Cannot write to {target_dir}. Please check directory permissions."
                
                with self._progress_lock:
                    if download_id in self.download_progress:
                        self.download_progress[download_id].update({
                            "status": "failed",
                            "progress": 0,
                            "message": f"Download failed: {error_details}",
                            "error": error_details,
                            "error_details": error_msg
                        })
        
        # Use non-daemon thread to ensure it completes
        thread = threading.Thread(target=download_thread, daemon=False, name=f"Download-{repo_id}")
        thread.start()
        return download_id
    
    def get_download_progress(self, download_id: str) -> Optional[Dict[str, Any]]:
        """Get download progress by download_id."""
        with self._progress_lock:
            progress = self.download_progress.get(download_id)
            if progress is None:
                # Try to find by repo_id if download_id not found (for backwards compatibility)
                logger.warning(f"Download ID not found: {download_id}. Available IDs: {list(self.download_progress.keys())[:5]}")
            return progress
    
    def get_download_progress_by_repo(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Get download progress by repo_id (finds most recent download for this repo)."""
        with self._progress_lock:
            # Find most recent download for this repo
            matching = []
            for did, prog in self.download_progress.items():
                if prog.get("repo_id") == repo_id:
                    matching.append((did, prog))
            if matching:
                # Return the most recent one (highest download_id timestamp)
                matching.sort(key=lambda x: x[0], reverse=True)
                logger.info(f"Found progress by repo_id {repo_id}: {matching[0][0]}")
                return matching[0][1]
            return None
    
    def list_active_downloads(self) -> Dict[str, Dict[str, Any]]:
        """List all active downloads (for debugging)."""
        with self._progress_lock:
            return dict(self.download_progress)
    
    def ensure_downloaded(self, repo_id: str, token: Optional[str] = None) -> Dict[str, Any]:
        """
        Download model snapshot using huggingface_hub if not present.
        Synchronous version - use start_download for async with progress.
        """
        if self.is_downloaded(repo_id):
            return self.model_info(repo_id)
        try:
            from huggingface_hub import snapshot_download
            target_dir = self._model_dir(repo_id)
            snapshot_download(
                repo_id=repo_id,
                local_dir=str(target_dir),
                local_dir_use_symlinks=False,
                token=token,
                resume_download=True
            )
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


