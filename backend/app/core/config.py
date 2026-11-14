from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/


DEV_SECRET_KEY = "dev-only-secret-key-change-me-in-production-0123456789"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    PROJECT_NAME: str = "인스타그램 클론 API"
    ENVIRONMENT: str = "development"  # "development" | "production"
    DOCS_ENABLED: bool = True  # Swagger /docs, /redoc, /openapi.json
    DATABASE_URL: str = "sqlite:///./instagram.db"
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    UPLOAD_DIR: str = "./static/uploads"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    MAX_IMAGES_PER_POST: int = 10
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024
    STORY_TTL_HOURS: int = 24
    STORY_PURGE_INTERVAL_MINUTES: int = 60  # how often expired stories (rows + files) are deleted

    @property
    def database_url(self) -> str:
        """Resolve relative sqlite paths against backend/ so cwd doesn't matter."""
        prefix = "sqlite:///./"
        if self.DATABASE_URL.startswith(prefix):
            return f"sqlite:///{(BASE_DIR / self.DATABASE_URL[len(prefix):]).as_posix()}"
        return self.DATABASE_URL

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        return p if p.is_absolute() else (BASE_DIR / p).resolve()

    @property
    def static_root(self) -> Path:
        # UPLOAD_DIR is <static_root>/uploads; files are served under /static
        return self.upload_path.parent


settings = Settings()

# Placeholder values shipped in code / .env.example must never sign real tokens.
_INSECURE_KEYS = {DEV_SECRET_KEY, "change-me-to-a-long-random-string"}
if settings.ENVIRONMENT == "production" and (settings.SECRET_KEY in _INSECURE_KEYS or len(settings.SECRET_KEY) < 32):
    raise RuntimeError("운영 환경(ENVIRONMENT=production)에서는 .env에 32자 이상의 랜덤 SECRET_KEY를 설정해야 합니다.")
