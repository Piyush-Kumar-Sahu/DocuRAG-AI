import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from app.core.config import settings

password_hash = PasswordHash((Argon2Hasher(),))

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def generate_otp_code(length: int = 6) -> str:
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))

def hash_otp(otp_code: str) -> str:
    return hmac.new(
        settings.OTP_PEPPER.encode("utf-8"),
        otp_code.strip().encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    candidate_hash = hash_otp(plain_otp)
    return hmac.compare_digest(candidate_hash, hashed_otp)

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_signature": True, "verify_exp": True}
        )
        return payload
    except jwt.PyJWTError:
        return None
