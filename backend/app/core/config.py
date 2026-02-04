"""Application configuration."""
import json
import os
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/badreview"

    # LLM
    LLM_PROXY_URL: str = "https://llm-proxy.densematrix.ai"
    LLM_PROXY_KEY: str = "sk-wskhgeyawc"
    LLM_MODEL: str = "gemini-2.5-flash"

    # Creem Payment
    CREEM_API_KEY: str = "creem_test_placeholder"
    CREEM_WEBHOOK_SECRET: str = "whsec_placeholder"
    CREEM_PRODUCT_IDS: dict = {}

    # Product pricing
    PRODUCTS: dict = {
        "translate_pack_3": {"price": 799, "generations": 3},
        "translate_pack_10": {"price": 1999, "generations": 10},
    }

    # Free trial
    FREE_TRIAL_LIMIT: int = 1

    @field_validator("CREEM_PRODUCT_IDS", mode="before")
    @classmethod
    def parse_creem_product_ids(cls, v):
        if isinstance(v, str) and v:
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return {}
        return v or {}

    model_config = {"env_file": ".env", "extra": "allow"}


settings = Settings()
