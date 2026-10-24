"""Environment-driven application settings.

No secrets are hard-coded. Values are read from the environment (and an optional
`.env` file). See `.env.example` for documented keys.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the KindSignals backend."""

    app_name: str = "KindSignals"
    app_version: str = "0.1.0"

    database_url: str = "sqlite:///./kindsignals.db"

    # PMOS Buddy provider: "fallback" (deterministic, no key) or "openai".
    llm_provider: str = "fallback"
    llm_api_key: str = ""
    # OpenAI chat model used when llm_provider == "openai".
    llm_model: str = "gpt-4o-mini"

    # Secret for signing session tokens. Override in production via env.
    # A fixed dev default keeps demo sessions valid across restarts.
    auth_secret: str = "kindsignals-dev-secret-change-me"

    # Allowed browser origins for the frontend dev server.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins as a cleaned list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
