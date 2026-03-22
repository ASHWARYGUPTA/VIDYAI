from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # AI
    gemini_api_key: str = ""
    openrouter_api_key: str = ""
    sarvam_api_key: str = ""
    llm_model: str = "google/gemma-3-4b-it:free"
    # Comma-separated fallback models tried in order when primary hits 429
    llm_fallback_models: str = "meta-llama/llama-3.2-1b-instruct:free,google/gemma-3-4b-it:free"

    # Queue
    redis_url: str = "redis://localhost:6379/0"
    rabbitmq_url: str = "amqp://vidyai:vidyai_dev@localhost:5672/vidyai"

    # Storage
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "vidyai-content"
    aws_region: str = "ap-south-1"

    # Billing
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Observability
    sentry_dsn: str = ""
    datadog_api_key: str = ""

    # Proxy (for YouTube transcript fetching when IP is blocked)
    youtube_proxy_url: str = ""
    # Path to Netscape cookies.txt for yt-dlp (bypasses bot detection / age gates)
    youtube_cookies_file: str = "services/api/cookies.txt"

    # App
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
