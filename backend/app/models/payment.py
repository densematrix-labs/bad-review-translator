"""PaymentTransaction Model — Records all payment events."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_id = Column(UUID(as_uuid=True), ForeignKey("generation_tokens.id"), nullable=False)
    product_sku = Column(String(50), nullable=False)
    provider = Column(String(20), nullable=False, default="creem")
    provider_transaction_id = Column(String(255), unique=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(String(20), nullable=False)
    device_id = Column(String(255))
    optional_email = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    token = relationship("GenerationToken", back_populates="transactions")
