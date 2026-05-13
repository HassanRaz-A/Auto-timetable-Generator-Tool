from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Intelligent Timetable Management System"
    database_url: str = "sqlite:///./ttms.db"
    secret_key: str = "change-me-in-production-use-a-long-random-string-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # Scheduling defaults
    num_days: int = 5  # Mon–Fri
    slots_per_day: int = 7  # 8:00–14:30 in 50-min blocks
    solver_time_limit: int = 30


settings = Settings()
