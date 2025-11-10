"""
Video storage service for managing generated videos and metadata.
"""
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class VideoStorage:
    def __init__(self, storage_base_path: str | None = None):
        if storage_base_path is None:
            self.storage_base_path = str(Path.cwd() / "videos")
        else:
            self.storage_base_path = storage_base_path
        os.makedirs(self.storage_base_path, exist_ok=True)
        self.metadata_file = os.path.join(self.storage_base_path, "metadata.json")
        self._load_metadata()
        logger.info(f"VideoStorage initialized at {self.storage_base_path}")

    def _load_metadata(self) -> None:
        try:
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {}
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            self.metadata = {}

    def _save_metadata(self) -> None:
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")

    def create_video_entry(self, params: dict) -> dict | None:
        try:
            video_id = str(uuid.uuid4())
            created_at = datetime.now().isoformat()
            video_metadata = {
                "id": video_id,
                "created_at": created_at,
                "frame_count": 0,
                "params": params,
            }
            video_dir = os.path.join(self.storage_base_path, video_id)
            os.makedirs(video_dir, exist_ok=True)
            self.metadata[video_id] = video_metadata
            self._save_metadata()
            return video_metadata
        except Exception as e:
            logger.error(f"Error creating video entry: {e}")
            return None

    def update_video_frames(self, video_id: str, frame_count: int) -> bool:
        try:
            if video_id not in self.metadata:
                return False
            self.metadata[video_id]["frame_count"] = frame_count
            self._save_metadata()
            return True
        except Exception as e:
            logger.error(f"Error updating video frames: {e}")
            return False

    def list_videos(self) -> list[dict]:
        try:
            return list(self.metadata.values())
        except Exception as e:
            logger.error(f"Error listing videos: {e}")
            return []

    def get_video(self, video_id: str) -> dict | None:
        try:
            return self.metadata.get(video_id)
        except Exception as e:
            logger.error(f"Error getting video {video_id}: {e}")
            return None

    def delete_video(self, video_id: str) -> bool:
        try:
            if video_id not in self.metadata:
                return False
            del self.metadata[video_id]
            self._save_metadata()
            video_dir = os.path.join(self.storage_base_path, video_id)
            if os.path.exists(video_dir):
                import shutil
                shutil.rmtree(video_dir)
            return True
        except Exception as e:
            logger.error(f"Error deleting video {video_id}: {e}")
            return False

    def _create_video_file(self, video_dir: Path, frames: list, fps: int = 30) -> bool:
        try:
            import cv2
            import numpy as np
            from PIL import Image

            if not frames:
                return False
            if frames and isinstance(frames[0], Image.Image):
                frame_arrays = []
                for frame in frames:
                    try:
                        arr = np.array(frame)
                        if arr is None or arr.size == 0:
                            continue
                        if len(arr.shape) == 3 and arr.shape[2] == 3:
                            arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
                        frame_arrays.append(arr)
                    except Exception:
                        continue
                if not frame_arrays:
                    return False
                height, width = frame_arrays[0].shape[:2]
                if height <= 0 or width <= 0:
                    return False
                output_path = os.path.join(video_dir, "output.mp4")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if not writer.isOpened():
                    return False
                written = 0
                for a in frame_arrays:
                    if a.shape[1] != width or a.shape[0] != height:
                        a = cv2.resize(a, (width, height))
                    writer.write(a)
                    written += 1
                writer.release()
                return written > 0
            else:
                frame_files = sorted([f for f in Path(video_dir).glob("frame_*.png")])
                if not frame_files:
                    return False
                first = cv2.imread(str(frame_files[0]))
                if first is None:
                    return False
                h, w = first.shape[:2]
                if h <= 0 or w <= 0:
                    return False
                output_path = os.path.join(video_dir, "output.mp4")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(output_path, fourcc, fps, (w, h))
                if not writer.isOpened():
                    return False
                written = 0
                for f in frame_files:
                    img = cv2.imread(str(f))
                    if img is None:
                        continue
                    if img.shape[1] != w or img.shape[0] != h:
                        img = cv2.resize(img, (w, h))
                    writer.write(img)
                    written += 1
                writer.release()
                return written > 0
        except Exception as e:
            logger.error(f"Error creating video file: {e}")
            return False

    def _create_thumbnail(self, video_dir: Path) -> bool:
        try:
            from PIL import Image
            frame_files = sorted([f for f in Path(video_dir).glob("frame_*.png")])
            if not frame_files:
                return False
            first = frame_files[0]
            thumb = Path(video_dir) / "thumbnail.jpg"
            with Image.open(first) as img:
                img.thumbnail((300, 200), Image.Resampling.LANCZOS)
                img.save(thumb, "JPEG", quality=85)
            return True
        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}")
            return False

    def save_video_bytes(self, video_dir: Path, data: bytes) -> bool:
        try:
            output_path = Path(video_dir) / "output.mp4"
            with open(output_path, 'wb') as f:
                f.write(data)
            return True
        except Exception as e:
            logger.error(f"Error saving video bytes: {e}")
            return False

    def extract_frames_from_video(self, video_dir: Path, fps: int | None = None) -> int:
        try:
            import cv2
            output_path = str(Path(video_dir) / "output.mp4")
            cap = cv2.VideoCapture(output_path)
            if not cap.isOpened():
                logger.error("Failed to open MP4 for frame extraction")
                return 0
            extracted = 0
            idx = 0
            fps_src = cap.get(cv2.CAP_PROP_FPS) or 8
            step = max(1, int(round(fps_src / (fps or fps_src))))
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if idx % step == 0:
                    p = Path(video_dir) / f"frame_{extracted:04d}.png"
                    try:
                        cv2.imwrite(str(p), frame)
                        extracted += 1
                    except Exception:
                        pass
                idx += 1
            cap.release()
            try:
                self._create_thumbnail(video_dir)
            except Exception:
                pass
            return extracted
        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            return 0


def get_video_storage() -> VideoStorage:
    return VideoStorage()


