from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import logging
from typing import Literal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI 差评翻译器", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LLM_PROXY_URL = "https://llm-proxy.densematrix.ai"
LLM_PROXY_KEY = "sk-wskhgeyawc"
LLM_MODEL = "gemini-2.5-flash"

SourceType = Literal["appstore", "restaurant", "ecommerce", "hotel", "other"]
LangType = Literal["en", "zh", "ja", "de", "fr", "ko", "es"]


class TranslateRequest(BaseModel):
    review: str
    source: SourceType
    language: LangType = "zh"


class TranslateResponse(BaseModel):
    original: str
    user_really_means: str
    boss_hears: str
    source: str
    language: str


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
                f"{LLM_PROXY_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {LLM_PROXY_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": LLM_MODEL,
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

    # Try direct JSON parse
    text = text.strip()
    # Remove markdown code blocks if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        data = json.loads(text)
        if "user_really_means" in data and "boss_hears" in data:
            return data
    except json.JSONDecodeError:
        pass

    # Fallback: extract from text
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


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "bad-review-translator"}


@app.post("/api/translate-review", response_model=TranslateResponse)
async def translate_review(request: TranslateRequest):
    """翻译差评"""
    if not request.review or not request.review.strip():
        raise HTTPException(status_code=400, detail="差评内容不能为空")

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
