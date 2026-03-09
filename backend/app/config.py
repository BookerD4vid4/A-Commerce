import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    
    # OTP
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    OTP_LENGTH: int = int(os.getenv("OTP_LENGTH", "6"))
    OTP_EXPIRY_MINUTES: int = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    OTP_RATE_LIMIT: int = int(os.getenv("OTP_RATE_LIMIT", "3"))
    OTP_RATE_WINDOW_MINUTES: int = int(os.getenv("OTP_RATE_WINDOW_MINUTES", "10"))
    
    # SMS
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    SMS_API_URL: str = os.getenv("SMS_API_URL", "")
    
    # AI Services
    TYPHOON_API_KEY: str = os.getenv("TYPHOON_API_KEY", "")
    TYPHOON_API_URL: str = os.getenv("TYPHOON_API_URL", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
    
    # Supabase Storage
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Payment
    OMISE_PUBLIC_KEY: str = os.getenv("OMISE_PUBLIC_KEY", "")
    OMISE_SECRET_KEY: str = os.getenv("OMISE_SECRET_KEY", "")
    
    # App
    APP_NAME: str = os.getenv("APP_NAME", "A-Commerce")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

settings = Settings()
