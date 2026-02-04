"""Payment Schemas — Pydantic models for payment API."""
from typing import Optional
from pydantic import BaseModel


class Product(BaseModel):
    sku: str
    name: str
    price_cents: int
    generations: int
    discount_percent: Optional[int] = None


class CreateCheckoutRequest(BaseModel):
    product_sku: str
    device_id: str
    optional_email: Optional[str] = None
    success_url: str
    cancel_url: str


class CreateCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
