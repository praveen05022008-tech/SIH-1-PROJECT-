import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Locate .env file in backend or root directory
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
ROOT_ENV_PATH = BASE_DIR.parent / ".env"

class Settings(BaseSettings):
    # TiDB Connection
    DB_HOST: str = "gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
    DB_PORT: int = 4000
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_NAME: str = "sif_shield"
    
    # Hugging Face & Whisper
    HF_TOKEN: str = ""
    WHISPER_MODEL: str = "openai/whisper-small"
    
    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    # Security
    JWT_SECRET: str = "sif-shield-super-secret-jwt-key-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Auto-revoke timeout in seconds
    UNWATCHED_TIMEOUT_SECONDS: int = 600

    class Config:
        env_file = [str(ENV_PATH), str(ROOT_ENV_PATH), ".env"]
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
