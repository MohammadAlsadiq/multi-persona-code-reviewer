from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is three levels up from this file (backend/app/core/config.py),
# so .env resolves consistently no matter what directory uvicorn is launched from.
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or a .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM credentials
    llm_api_key: str = ""
    llm_base_url: str = "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat"
    llm_model: str = "ibm/granite-3-8b-instruct"


settings = Settings()
