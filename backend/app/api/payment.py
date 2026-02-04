"""Creem Payment Router — Checkout + Webhook handling."""
import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import GenerationToken, PaymentTransaction
from app.schemas.payment import Product, CreateCheckoutRequest, CreateCheckoutResponse


def get_creem_api_base():
    """Use test API for test keys, production API for live keys."""
    if settings.CREEM_API_KEY.startswith("creem_test_"):
        return "https://test-api.creem.io/v1"
    return "https://api.creem.io/v1"


router = APIRouter()


@router.get("/payment/products", response_model=list[Product])
async def get_products():
    """Get available product packages."""
    products = []
    for sku, info in settings.PRODUCTS.items():
        products.append(
            Product(
                sku=sku,
                name=sku.replace("_", " ").title(),
                price_cents=info["price"],
                generations=info["generations"],
                discount_percent=_calculate_discount(sku) if len(settings.PRODUCTS) > 1 else None,
            )
        )
    return products


def _calculate_discount(sku: str) -> int | None:
    """Calculate discount vs cheapest per-unit price."""
    if len(settings.PRODUCTS) < 2:
        return None
    per_unit_prices = {
        k: v["price"] / v["generations"] for k, v in settings.PRODUCTS.items()
    }
    max_per_unit = max(per_unit_prices.values())
    this_per_unit = per_unit_prices[sku]
    if this_per_unit >= max_per_unit:
        return None
    return int(((max_per_unit - this_per_unit) / max_per_unit) * 100)


@router.post("/payment/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a Creem checkout session."""
    if request.product_sku not in settings.PRODUCTS:
        raise HTTPException(status_code=400, detail="Invalid product SKU")

    creem_product_id = settings.CREEM_PRODUCT_IDS.get(request.product_sku)
    if not creem_product_id:
        raise HTTPException(status_code=400, detail="Product not configured in Creem")

    product = settings.PRODUCTS[request.product_sku]

    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "product_id": creem_product_id,
                "success_url": request.success_url,
                "metadata": {
                    "product_sku": request.product_sku,
                    "device_id": request.device_id,
                    "generations": str(product["generations"]),
                },
            }
            if request.optional_email:
                payload["customer"] = {"email": request.optional_email}

            response = await client.post(
                f"{get_creem_api_base()}/checkouts",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": settings.CREEM_API_KEY,
                },
                json=payload,
                timeout=30.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Creem API error: {response.text}",
                )

            data = response.json()
            return CreateCheckoutResponse(
                checkout_url=data["checkout_url"],
                session_id=data["id"],
            )

    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Payment service error: {str(e)}")


def verify_creem_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Creem webhook signature using HMAC-SHA256."""
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


@router.post("/webhooks/creem")
async def creem_webhook(
    request: Request,
    creem_signature: str = Header(None, alias="creem-signature"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Creem webhook events."""
    payload = await request.body()

    if not creem_signature or not verify_creem_signature(
        payload, creem_signature, settings.CREEM_WEBHOOK_SECRET
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(payload.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("eventType")

    if event_type == "checkout.completed":
        await _handle_checkout_completed(event, db)

    return {"received": True}


async def _handle_checkout_completed(event: dict, db: AsyncSession):
    """Handle successful checkout — create token + record transaction."""
    obj = event.get("object", {})
    metadata = obj.get("metadata", {})
    customer = obj.get("customer", {})
    order = obj.get("order", {})

    product_sku = metadata.get("product_sku")
    device_id = metadata.get("device_id")
    generations = int(metadata.get("generations", 1))

    # Create token
    token = GenerationToken.create_token(
        product_sku=product_sku,
        generations=generations,
        device_id=device_id,
    )
    db.add(token)
    await db.flush()

    # Record transaction
    transaction = PaymentTransaction(
        token_id=token.id,
        product_sku=product_sku,
        provider="creem",
        provider_transaction_id=obj.get("id"),
        amount_cents=order.get("amount", 0),
        currency=order.get("currency", "usd"),
        status="succeeded",
        device_id=device_id,
        optional_email=customer.get("email"),
    )
    db.add(transaction)
    await db.commit()
