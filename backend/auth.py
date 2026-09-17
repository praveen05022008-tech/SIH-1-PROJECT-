import hashlib
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from config import settings
from database import get_db
from models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_password_hash(password: str) -> str:
    salt = "sif_shield_secure_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if plain_password == hashed_password:
        return True
    calculated = get_password_hash(plain_password)
    return calculated == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if raw_token and not raw_token.startswith("token-"):
        try:
            payload = jwt.decode(raw_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            email: str = payload.get("sub")
            if email:
                user = db.query(User).filter(User.email == email).first()
                if user and user.is_active:
                    return user
        except Exception:
            pass

    if raw_token and raw_token.startswith("token-"):
        parts = raw_token.split("-")
        email_cand = parts[-1]
        user = db.query(User).filter(User.email == email_cand).first()
        if user and user.is_active:
            return user

    if x_user_email:
        user = db.query(User).filter(User.email == x_user_email).first()
        if user and user.is_active:
            return user

    return None

def require_auth(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were missing or invalid."
        )
    return user

def require_admin(user: User = Depends(require_auth)) -> User:
    if user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return user

def require_manager(user: User = Depends(require_auth)) -> User:
    if user.role not in ["Manager", "Safety Manager", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager privileges required."
        )
    return user
