from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import User, Notification, AuditLog
from schemas import UserRegisterRequest, UserLoginRequest, UserResponse
from auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Normalize role
    role = req.role.strip()
    if role in ["Safety Officer", "Officer"]:
        role = "Officer"
    elif role in ["Safety Manager", "Manager"]:
        role = "Manager"
    elif role in ["Field Worker", "Employee"]:
        role = "Employee"

    # All signups default to Pending approval
    new_user = User(
        email=req.email.lower().strip(),
        password_hash=get_password_hash(req.password),
        name=req.name.strip(),
        role=role,
        id_number=req.id_number,
        phone=req.phone,
        address=req.address,
        approval_status="Pending",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Add notification for Admin
    admin_notif = Notification(
        recipient_role="Admin",
        title="New User Registration Request",
        message=f"{new_user.name} ({new_user.email}) has signed up as {new_user.role} and is awaiting approval."
    )
    db.add(admin_notif)

    # Audit log
    audit = AuditLog(
        user_email=new_user.email,
        user_role=new_user.role,
        action="USER_REGISTERED_PENDING_APPROVAL",
        details=f"User {new_user.name} registered with role {new_user.role}. Status: Pending"
    )
    db.add(audit)
    db.commit()

    return new_user

@router.post("/login", response_model=UserResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Check approval status
    if user.approval_status == "Pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please contact the system administrator."
        )
    elif user.approval_status == "Rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration was rejected by the administrator."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated."
        )

    token = create_access_token({"sub": user.email, "role": user.role, "name": user.name})
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        id_number=user.id_number,
        phone=user.phone,
        address=user.address,
        approval_status=user.approval_status,
        is_active=user.is_active,
        created_at=user.created_at,
        token=token
    )

@router.get("/me", response_model=UserResponse)
def get_me(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user
