"""Token Router — Query, validate, and list tokens."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models import GenerationToken

router = APIRouter()


class TokenInfo(BaseModel):
    token: str
    remaining_generations: int
    total_generations: int
    expires_at: str
    product_sku: str


class TokenListResponse(BaseModel):
    tokens: list[TokenInfo]


class ValidateResponse(BaseModel):
    valid: bool


@router.get("/tokens/info/{token}", response_model=TokenInfo)
async def get_token_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get token information."""
    result = await db.execute(
        select(GenerationToken).where(GenerationToken.token == token)
    )
    token_obj = result.scalar_one_or_none()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Token not found")

    return TokenInfo(
        token=token_obj.token,
        remaining_generations=token_obj.remaining_generations,
        total_generations=token_obj.total_generations,
        expires_at=token_obj.expires_at.isoformat(),
        product_sku=token_obj.product_sku,
    )


@router.post("/tokens/validate", response_model=ValidateResponse)
async def validate_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Validate if a token is valid and has remaining generations."""
    result = await db.execute(
        select(GenerationToken).where(GenerationToken.token == token)
    )
    token_obj = result.scalar_one_or_none()
    if not token_obj:
        return ValidateResponse(valid=False)
    return ValidateResponse(valid=token_obj.is_valid)


@router.get("/tokens/by-device/{device_id}", response_model=TokenListResponse)
async def get_tokens_by_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all valid tokens for a device."""
    now = datetime.utcnow()
    result = await db.execute(
        select(GenerationToken).where(
            GenerationToken.device_id == device_id,
            GenerationToken.remaining_generations > 0,
            GenerationToken.expires_at > now,
        )
    )
    tokens = result.scalars().all()

    return TokenListResponse(
        tokens=[
            TokenInfo(
                token=t.token,
                remaining_generations=t.remaining_generations,
                total_generations=t.total_generations,
                expires_at=t.expires_at.isoformat(),
                product_sku=t.product_sku,
            )
            for t in tokens
        ]
    )
