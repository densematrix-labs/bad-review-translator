from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import logging
from typing import Literal, Optional
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db, init_db
from app.models import GenerationToken, FreeTrialTracking
from app.api.payment import router as payment_router
from app.api.tokens import router as tokens_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await init_db()
    yield


app = FastAPI(title="AI 差评翻译器", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register payment and token routers under /api
app.include_router(payment_router, prefix="/api")
app.include_router(tokens_router, prefix="/api")


SourceType = Literal["appstore", "restaurant", "ecommerce", "hotel", "other"]
LangType = Literal["en", "zh", "ja", "de", "fr", "ko", "es"]


class TranslateRequest(BaseModel):
    review: str
    source: SourceType
    language: LangType = "zh"
    device_id: Optional[str] = None
    token: Optional[str] = None


class TranslateResponse(BaseModel):
    original: str
    user_really_means: str
    boss_hears: str
    source: str
    language: str


class TrialStatusResponse(BaseModel):
    has_free_trial: bool
    uses_remaining: int


SOURCE_LABELS_ZH = {
    "appstore": "App Store 应用",
    "restaurant": "餐厅",
    "ecommerce": "电商商品",
    "hotel": "酒店",
    "other": "产品/服务",
}

SOURCE_LABELS_EN = {
    "appstore": "App Store app",
    "restaurant": "restaurant",
    "ecommerce": "e-commerce product",
    "hotel": "hotel",
    "other": "product/service",
}


async def call_llm(prompt: str) -> str:
    """调用 LLM 代理生成文本"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.LLM_PROXY_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_PROXY_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.8,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"LLM API 调用失败: {e}")
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")


def build_prompt(review: str, source: SourceType, language: LangType) -> str:
    """构建 LLM 提示词"""
    if language == "en":
        source_label = SOURCE_LABELS_EN[source]
        return f"""You are a humorous translator of bad reviews. Given a bad review for a {source_label}, translate it into two perspectives:

1. **What the user REALLY means** (the unfiltered inner monologue — brutally honest, sarcastic, dramatic)
2. **What the boss/developer hears** (the delusional optimistic spin — how management interprets criticism)

Bad review: "{review}"

Respond in this EXACT JSON format (no markdown, no code blocks):
{{"user_really_means": "...", "boss_hears": "..."}}

Make it funny, exaggerated, and shareable. Each perspective should be 2-4 sentences."""
    else:
        source_label = SOURCE_LABELS_ZH[source]
        return f"""你是一个搞笑的差评翻译器。给定一条关于{source_label}的差评，请翻译成两个视角：

1. **用户真正想说的**（内心OS，不加掩饰，毒舌、夸张、戏剧化）
2. **老板/开发者听到的**（管理层的乐观解读，把批评都当成正面反馈）

差评原文："{review}"

请严格按以下 JSON 格式回答（不要 markdown，不要代码块）：
{{"user_really_means": "...", "boss_hears": "..."}}

要搞笑、夸张、有梗，让人想分享。每个视角 2-4 句话。"""


def parse_llm_response(text: str) -> dict:
    """解析 LLM 返回的 JSON"""
    import json
    import re

    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        data = json.loads(text)
        if "user_really_means" in data and "boss_hears" in data:
            return data
    except json.JSONDecodeError:
        pass

    user_match = re.search(
        r'"user_really_means"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text
    )
    boss_match = re.search(r'"boss_hears"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', text)

    if user_match and boss_match:
        return {
            "user_really_means": user_match.group(1).replace('\\"', '"'),
            "boss_hears": boss_match.group(1).replace('\\"', '"'),
        }

    raise ValueError(f"无法解析 LLM 返回: {text[:200]}")


async def check_and_use_free_trial(device_id: str, db: AsyncSession) -> bool:
    """Check if device has free trial remaining. If so, consume one use. Returns True if allowed."""
    if not device_id:
        return False

    result = await db.execute(
        select(FreeTrialTracking).where(FreeTrialTracking.device_id == device_id)
    )
    tracking = result.scalar_one_or_none()

    if tracking is None:
        # First use — create tracking and allow
        tracking = FreeTrialTracking(device_id=device_id, uses_count=1)
        db.add(tracking)
        await db.commit()
        return True
    elif tracking.uses_count < settings.FREE_TRIAL_LIMIT:
        tracking.uses_count += 1
        await db.commit()
        return True
    else:
        return False


async def check_and_use_token(token_str: str, db: AsyncSession) -> bool:
    """Validate token and consume one generation. Returns True if successful."""
    if not token_str:
        return False

    result = await db.execute(
        select(GenerationToken).where(GenerationToken.token == token_str)
    )
    token_obj = result.scalar_one_or_none()

    if token_obj and token_obj.use_generation():
        await db.commit()
        return True
    return False


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "bad-review-translator"}


@app.get("/api/trial-status/{device_id}", response_model=TrialStatusResponse)
async def get_trial_status(device_id: str, db: AsyncSession = Depends(get_db)):
    """Check free trial status for a device."""
    result = await db.execute(
        select(FreeTrialTracking).where(FreeTrialTracking.device_id == device_id)
    )
    tracking = result.scalar_one_or_none()

    if tracking is None:
        return TrialStatusResponse(has_free_trial=True, uses_remaining=settings.FREE_TRIAL_LIMIT)
    else:
        remaining = max(0, settings.FREE_TRIAL_LIMIT - tracking.uses_count)
        return TrialStatusResponse(has_free_trial=remaining > 0, uses_remaining=remaining)


@app.post("/api/translate-review", response_model=TranslateResponse)
async def translate_review(request: TranslateRequest, db: AsyncSession = Depends(get_db)):
    """翻译差评 — with token consumption logic."""
    if not request.review or not request.review.strip():
        raise HTTPException(status_code=400, detail="差评内容不能为空")

    # 1. Try paid token first
    if request.token:
        if await check_and_use_token(request.token, db):
            pass  # Authorized via token
        else:
            raise HTTPException(
                status_code=402,
                detail="Token is invalid, expired, or has no remaining generations"
            )
    # 2. Try free trial
    elif request.device_id:
        if not await check_and_use_free_trial(request.device_id, db):
            raise HTTPException(
                status_code=402,
                detail="Free trial exhausted. Please purchase credits to continue."
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Either device_id (for free trial) or token (for paid use) is required"
        )

    # Execute translation
    try:
        prompt = build_prompt(request.review, request.source, request.language)
        raw = await call_llm(prompt)
        parsed = parse_llm_response(raw)

        return TranslateResponse(
            original=request.review.strip(),
            user_really_means=parsed["user_really_means"],
            boss_hears=parsed["boss_hears"],
            source=request.source,
            language=request.language,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"翻译差评失败: {e}")
        raise HTTPException(status_code=500, detail="翻译差评时发生错误")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
