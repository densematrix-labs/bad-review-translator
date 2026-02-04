import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from main import app, build_prompt, parse_llm_response

client = TestClient(app)

MOCK_LLM_RESPONSE = '{"user_really_means": "这垃圾应用简直是在侮辱我的手机存储空间，每次打开都像在看PPT", "boss_hears": "用户对我们的加载动画很感兴趣，反复观看，说明我们的设计很吸引人"}'
MOCK_LLM_RESPONSE_EN = '{"user_really_means": "This app is so slow it makes dial-up internet look like fiber optic", "boss_hears": "The user appreciates our deliberate loading experience that builds anticipation"}'


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "bad-review-translator"}


def test_empty_review():
    response = client.post("/api/translate-review", json={
        "review": "",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 400


def test_whitespace_review():
    response = client.post("/api/translate-review", json={
        "review": "   ",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 400


def test_invalid_source():
    response = client.post("/api/translate-review", json={
        "review": "差评",
        "source": "invalid",
        "language": "zh"
    })
    assert response.status_code == 422


def test_invalid_language():
    response = client.post("/api/translate-review", json={
        "review": "差评",
        "source": "appstore",
        "language": "xx"
    })
    assert response.status_code == 422


def test_missing_fields():
    response = client.post("/api/translate-review", json={})
    assert response.status_code == 422

    response = client.post("/api/translate-review", json={"review": "test"})
    assert response.status_code == 422


@patch('main.call_llm', new_callable=AsyncMock)
def test_translate_success_zh(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE
    response = client.post("/api/translate-review", json={
        "review": "这个应用太卡了",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["original"] == "这个应用太卡了"
    assert data["source"] == "appstore"
    assert data["language"] == "zh"
    assert len(data["user_really_means"]) > 0
    assert len(data["boss_hears"]) > 0


@patch('main.call_llm', new_callable=AsyncMock)
def test_translate_success_en(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE_EN
    response = client.post("/api/translate-review", json={
        "review": "This app is terrible",
        "source": "appstore",
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "en"
    assert len(data["user_really_means"]) > 0


@patch('main.call_llm', new_callable=AsyncMock)
def test_translate_default_language(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE
    response = client.post("/api/translate-review", json={
        "review": "差评",
        "source": "restaurant"
    })
    assert response.status_code == 200
    assert response.json()["language"] == "zh"


@patch('main.call_llm', new_callable=AsyncMock)
def test_all_sources(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE
    for source in ["appstore", "restaurant", "ecommerce", "hotel", "other"]:
        response = client.post("/api/translate-review", json={
            "review": "差评",
            "source": source,
            "language": "zh"
        })
        assert response.status_code == 200, f"Source {source} failed"


@patch('main.call_llm', new_callable=AsyncMock)
def test_all_languages(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE
    for lang in ["en", "zh", "ja", "de", "fr", "ko", "es"]:
        response = client.post("/api/translate-review", json={
            "review": "Bad",
            "source": "appstore",
            "language": lang
        })
        assert response.status_code == 200, f"Language {lang} failed"


@patch('main.call_llm', new_callable=AsyncMock)
def test_llm_failure(mock_llm):
    from fastapi import HTTPException
    mock_llm.side_effect = HTTPException(status_code=500, detail="AI 生成失败: timeout")
    response = client.post("/api/translate-review", json={
        "review": "差评",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 500


@patch('main.call_llm', new_callable=AsyncMock)
def test_generic_exception(mock_llm):
    mock_llm.return_value = "not json at all"
    response = client.post("/api/translate-review", json={
        "review": "差评",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 500


@patch('main.call_llm', new_callable=AsyncMock)
def test_response_strips_whitespace(mock_llm):
    mock_llm.return_value = MOCK_LLM_RESPONSE
    response = client.post("/api/translate-review", json={
        "review": "  差评  ",
        "source": "appstore",
        "language": "zh"
    })
    assert response.status_code == 200
    assert response.json()["original"] == "差评"


# ===== build_prompt tests =====

def test_build_prompt_zh():
    prompt = build_prompt("差评", "restaurant", "zh")
    assert "餐厅" in prompt
    assert "差评" in prompt
    assert "用户真正想说的" in prompt


def test_build_prompt_en():
    prompt = build_prompt("Bad review", "appstore", "en")
    assert "App Store app" in prompt
    assert "Bad review" in prompt
    assert "REALLY means" in prompt


def test_build_prompt_all_sources_zh():
    for source in ["appstore", "restaurant", "ecommerce", "hotel", "other"]:
        prompt = build_prompt("test", source, "zh")
        assert len(prompt) > 50


def test_build_prompt_all_sources_en():
    for source in ["appstore", "restaurant", "ecommerce", "hotel", "other"]:
        prompt = build_prompt("test", source, "en")
        assert len(prompt) > 50


# ===== parse_llm_response tests =====

def test_parse_valid_json():
    result = parse_llm_response('{"user_really_means": "a", "boss_hears": "b"}')
    assert result["user_really_means"] == "a"
    assert result["boss_hears"] == "b"


def test_parse_json_with_code_block():
    result = parse_llm_response('```json\n{"user_really_means": "a", "boss_hears": "b"}\n```')
    assert result["user_really_means"] == "a"


def test_parse_json_with_extra_fields():
    result = parse_llm_response('{"user_really_means": "a", "boss_hears": "b", "extra": "c"}')
    assert result["user_really_means"] == "a"


def test_parse_invalid_json():
    with pytest.raises(ValueError, match="无法解析"):
        parse_llm_response("completely invalid text")


def test_parse_regex_fallback():
    # JSON with trailing comma (invalid JSON but regex can handle)
    text = '{"user_really_means": "hello world", "boss_hears": "great feedback",}'
    result = parse_llm_response(text)
    assert "hello world" in result["user_really_means"]


# ===== call_llm tests =====

@pytest.mark.asyncio
async def test_call_llm_success():
    from main import call_llm

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "test content"}}]
    }

    with patch('main.httpx.AsyncClient') as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_cls.return_value = mock_client

        result = await call_llm("test")
        assert result == "test content"


@pytest.mark.asyncio
async def test_call_llm_error():
    from main import call_llm
    from fastapi import HTTPException

    with patch('main.httpx.AsyncClient') as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            await call_llm("test")
        assert exc.value.status_code == 500


def test_app_metadata():
    from main import app
    assert app.title == "AI 差评翻译器"
