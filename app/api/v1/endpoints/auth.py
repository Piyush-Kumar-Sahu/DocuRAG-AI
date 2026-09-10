from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    OTPRequest,
    OTPVerify,
    PasswordResetRequest,
    PasswordResetConfirm,
    MessageResponse,
)
from app.schemas.user import UserResponse
from app.models.user import User
from app.models.otp import OTPPurpose
from app.services.auth_service import auth_service
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    try:
        user, _ = auth_service.register_user(db, email=user_in.email, password=user_in.password, name=user_in.name)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, email=login_in.email, password=login_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")

@router.post("/request-otp", response_model=MessageResponse)
def request_otp(otp_in: OTPRequest, db: Session = Depends(get_db)):
    try:
        auth_service.request_otp(db, email=otp_in.email, purpose=otp_in.purpose)
        return MessageResponse(
            message=f"A one-time verification code has been dispatched to {otp_in.email}."
        )
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "does not exist" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=str(e)
        )

@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(verify_in: OTPVerify, db: Session = Depends(get_db)):
    try:
        auth_service.verify_otp(
            db=db,
            email=verify_in.email,
            plain_otp=verify_in.otp_code,
            purpose=verify_in.purpose
        )
        return MessageResponse(
            message="Verification successful. Your account is now verified."
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(reset_in: PasswordResetConfirm, db: Session = Depends(get_db)):
    try:
        auth_service.reset_password_with_otp(
            db=db,
            email=reset_in.email,
            plain_otp=reset_in.otp_code,
            new_password=reset_in.new_password
        )
        return MessageResponse(
            message="Password has been successfully updated. You may now login with your new password."
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
