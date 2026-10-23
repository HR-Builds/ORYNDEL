from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    FRONTEND_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"

    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    MAIL_FROM: str

    BANK_NAME: str = ""
    BANK_ACCOUNT_TITLE: str = ""
    BANK_ACCOUNT_NUMBER: str = ""

    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    XAI_API_KEY: str = ""
    TAVILY_API_KEY: str = ""


settings = Settings()
