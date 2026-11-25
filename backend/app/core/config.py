from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CareerPilot AI API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./careerpilot.db"
    jwt_secret_key: str = "development-only-change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:4200"
    max_upload_size_mb: int = 5
    allowed_resume_extensions: str = ".pdf,.docx"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resume_extension_set(self) -> set[str]:
        return {extension.strip().lower() for extension in self.allowed_resume_extensions.split(",") if extension.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
