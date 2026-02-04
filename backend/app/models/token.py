"""GenerationToken Model — Token-based usage tracking."""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class GenerationToken(Base):
    __tablename__ = "generation_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(255), unique=True, nullable=False, index=True)
    product_sku = Column(String(50), nullable=False)
    total_generations = Column(Integer, nullable=False)
    remaining_generations = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    device_id = Column(String(255), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = relationship("PaymentTransaction", back_populates="token")

    @classmethod
    def create_token(cls, product_sku: str, generations: int, device_id: str = None):
        """Create a new token with 1 year validity."""
        return cls(
            token=f"tok_{uuid.uuid4().hex}",
            product_sku=product_sku,
            total_generations=generations,
            remaining_generations=generations,
            expires_at=datetime.utcnow() + timedelta(days=365),
            device_id=device_id,
        )

    def use_generation(self) -> bool:
        """Consume one generation. Returns True if successful."""
        if self.remaining_generations > 0 and datetime.utcnow() < self.expires_at:
            self.remaining_generations -= 1
            return True
        return False

    @property
    def is_valid(self) -> bool:
        return self.remaining_generations > 0 and datetime.utcnow() < self.expires_at
