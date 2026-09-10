import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid_str() -> str:
    return str(uuid.uuid4())

class OTPPurpose(str, enum.Enum):
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    PASSWORD_RESET = "PASSWORD_RESET"

class OTP(Base):
    __tablename__ = "otps"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hashed_otp = Column(String(128), nullable=False)  # HMAC-SHA256 hash
    purpose = Column(String(50), default=OTPPurpose.EMAIL_VERIFICATION.value, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="otps")
