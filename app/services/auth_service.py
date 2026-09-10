from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    generate_otp_code,
    hash_otp,
    verify_otp_hash,
)
from app.models.user import User
from app.models.otp import OTP, OTPPurpose
from app.services.email_service import email_service

class AuthService:
    @staticmethod
    def register_user(db: Session, email: str, password: str, name: Optional[str] = None) -> Tuple[User, str]:
        normalized_email = email.strip().lower()
        clean_name = name.strip() if name and name.strip() else None
        hashed_password = get_password_hash(password)

        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            if existing_user.is_verified:
                raise ValueError("An account with this email already exists. Please sign in.")
            if clean_name:
                existing_user.name = clean_name
            existing_user.hashed_password = hashed_password
            user = existing_user
        else:
            user = User(
                name=clean_name,
                email=normalized_email,
                hashed_password=hashed_password,
                is_verified=False,
                is_active=True,
            )
            db.add(user)
        if user.id:
            db.query(OTP).filter(
                and_(
                    OTP.user_id == user.id,
                    OTP.purpose == OTPPurpose.EMAIL_VERIFICATION.value,
                    OTP.is_used == False,
                )
            ).update({"is_used": True})
        db.flush()

        plain_otp = generate_otp_code(6)
        hashed_otp = hash_otp(plain_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        otp_record = OTP(
            user_id=user.id,
            hashed_otp=hashed_otp,
            purpose=OTPPurpose.EMAIL_VERIFICATION.value,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(otp_record)
        email_sent = email_service.send_otp_email(
            to_email=user.email,
            otp_code=plain_otp,
            purpose="Email Verification",
            user_name=user.name,
        )

        if not email_sent:
            db.rollback()
            raise ValueError("Unable to send verification email. Please check your email configuration or try again.")

        db.commit()
        db.refresh(user)
        return user, plain_otp

    @staticmethod
    def create_and_send_otp(db: Session, user: User, purpose: OTPPurpose) -> str:
        db.query(OTP).filter(
            and_(
                OTP.user_id == user.id,
                OTP.purpose == purpose.value,
                OTP.is_used == False,
            )
        ).update({"is_used": True})

        plain_otp = generate_otp_code(6)
        hashed_otp = hash_otp(plain_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        otp_record = OTP(
            user_id=user.id,
            hashed_otp=hashed_otp,
            purpose=purpose.value,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(otp_record)

        email_sent = email_service.send_otp_email(
            to_email=user.email,
            otp_code=plain_otp,
            purpose="Email Verification" if purpose == OTPPurpose.EMAIL_VERIFICATION else "Password Reset",
            user_name=user.name,
        )

        if not email_sent:
            db.rollback()
            raise ValueError("Unable to send verification email. Please check your email configuration or try again.")

        db.commit()
        return plain_otp

    @staticmethod
    def request_otp(db: Session, email: str, purpose: OTPPurpose) -> str:
        """Request a new OTP for an existing user."""
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise ValueError("User with this email does not exist.")

        if purpose == OTPPurpose.EMAIL_VERIFICATION and user.is_verified:
            raise ValueError("This account is already verified. Please sign in.")

        return AuthService.create_and_send_otp(db, user, purpose)

    @staticmethod
    def verify_otp(db: Session, email: str, plain_otp: str, purpose: OTPPurpose) -> bool:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise ValueError("User with this email does not exist.")
        now = datetime.now(timezone.utc)
        otp_records = (
            db.query(OTP)
            .filter(
                and_(
                    OTP.user_id == user.id,
                    OTP.purpose == purpose.value,
                    OTP.is_used == False,
                )
            )
            .order_by(OTP.created_at.desc()).all()
        )

        if not otp_records:
            raise ValueError("No active verification code found. Please request a new code.")

        latest_record = otp_records[0]
        if latest_record.expires_at <= now:
            raise ValueError("Verification code has expired. Please request a new code.")

        if not verify_otp_hash(plain_otp.strip(), latest_record.hashed_otp):
            raise ValueError("Invalid verification code. Please check the code and try again.")

        for record in otp_records:
            record.is_used = True

        if purpose == OTPPurpose.EMAIL_VERIFICATION:
            user.is_verified = True

        db.commit()
        return True

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def reset_password_with_otp(db: Session, email: str, plain_otp: str, new_password: str) -> bool:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise ValueError("User with this email does not exist.")
        AuthService.verify_otp(db, email, plain_otp, OTPPurpose.PASSWORD_RESET)
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True

auth_service = AuthService()
