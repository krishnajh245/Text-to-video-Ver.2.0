import logging
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    app_name: str = Field(default="Text-to-Video Generator")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    storage_base_path: str = Field(default=str(Path.cwd() / "videos"))
    allowed_origins: list[str] | None = None
    secret_key: str | None = None
    hf_model_repo: str = Field(default="damo-vilab/text-to-video-ms-1.7b")
    hf_timeout_seconds: int = Field(default=180)

    class Config:
        env_file = ".env"
        env_prefix = "TTG_"
        case_sensitive = False

settings = Settings()


def setup_logging():
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def initialize_application():
    setup_logging()
    # Ensure storage path exists
    Path(settings.storage_base_path).mkdir(parents=True, exist_ok=True)
