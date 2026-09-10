from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.otp import OTPPurpose

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class OTPRequest(BaseModel):
    email: EmailStr
    purpose: OTPPurpose = OTPPurpose.EMAIL_VERIFICATION

class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit numeric OTP")
    purpose: OTPPurpose = OTPPurpose.EMAIL_VERIFICATION

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
