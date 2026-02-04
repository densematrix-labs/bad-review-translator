"""Tests for the Bad Review Translator API."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Mock the database before importing the app
import sys
from unittest.mock import MagicMock

# We need to mock database modules before importing main
mock_engine = MagicMock()
mock_session = MagicMock()


# Patch database at module level for import
with patch.dict('os.environ', {
    'DATABASE_URL': 'sqlite+aiosqlite:///test.db',
}):
    from main import app, build_prompt, parse_llm_response

client = TestClient(app)


def test_health_check():
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "bad-review-translator"


def test_build_prompt_english():
    """Test English prompt generation."""
    prompt = build_prompt("terrible app", "appstore", "en")
    assert "App Store app" in prompt
    assert "terrible app" in prompt
    assert "user_really_means" in prompt


def test_build_prompt_chinese():
    """Test Chinese prompt generation."""
    prompt = build_prompt("差评", "restaurant", "zh")
    assert "餐厅" in prompt
    assert "差评" in prompt


def test_parse_llm_response_valid():
    """Test parsing valid JSON response."""
    response = '{"user_really_means": "test user", "boss_hears": "test boss"}'
    result = parse_llm_response(response)
    assert result["user_really_means"] == "test user"
    assert result["boss_hears"] == "test boss"


def test_parse_llm_response_with_markdown():
    """Test parsing response with markdown code blocks."""
    response = '```json\n{"user_really_means": "test", "boss_hears": "boss"}\n```'
    result = parse_llm_response(response)
    assert result["user_really_means"] == "test"
    assert result["boss_hears"] == "boss"


def test_parse_llm_response_invalid():
    """Test parsing invalid response raises error."""
    with pytest.raises(ValueError):
        parse_llm_response("not json at all")
