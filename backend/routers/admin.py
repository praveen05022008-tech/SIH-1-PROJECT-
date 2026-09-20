from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from database import get_db
from models import User, IncidentReport, AuditLog, Notification
from schemas import UserResponse, UserApprovalAction, RoleUpdateRequest
from auth import get_current_user, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin Console"])

def serialize_user_for_admin(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name or "User",
        "id_number": u.id_number or f"EMP-{u.id:03d}",
        "email": u.email,
        "phone": u.phone or "",
        "address": u.address or "",
        "role": u.role,
        "approval_status": u.approval_status,
        "is_active": bool(u.is_active),
        "created_at": u.created_at.isoformat() if u.created_at else ""
    }

@router.get("/users")
def list_admin_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if status and status != "All":
        query = query.filter(User.approval_status == status)
    if role and role != "All":
        query = query.filter(User.role == role)

    users = query.order_by(User.created_at.desc()).all()
    return [serialize_user_for_admin(u) for u in users]

@router.post("/users")
@router.post("/create-user")
async def create_admin_user(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email", "").lower().strip()
    name = data.get("name", "").strip()
    role = data.get("role", "Employee").strip()
    password = data.get("password", "password123")
    id_number = data.get("id_number", "")
    phone = data.get("phone", "")
    address = data.get("address", "")
    
    if not email or not name:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    if role in ["Safety Officer", "Officer"]:
        role = "Officer"
    elif role in ["Safety Manager", "Manager"]:
        role = "Manager"
    elif role in ["Field Worker", "Employee"]:
        role = "Employee"

    new_user = User(
        email=email,
        password_hash=get_password_hash(password),
        name=name,
        role=role,
        id_number=id_number or None,
        phone=phone or None,
        address=address or None,
        approval_status="Approved",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit = AuditLog(
        user_email="admin@refinery.safe",
        user_role="Admin",
        action="USER_CREATED_BY_ADMIN",
        details=f"Admin created user {new_user.name} ({new_user.email}) with role {new_user.role}"
    )
    db.add(audit)
    db.commit()

    return serialize_user_for_admin(new_user)

@router.get("/pending-requests")
def list_pending_requests(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.approval_status == "Pending").order_by(User.created_at.desc()).all()
    return [serialize_user_for_admin(u) for u in users]

@router.get("/requests")
def list_requests_alias(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.approval_status == "Pending").order_by(User.created_at.desc()).all()
    return [serialize_user_for_admin(u) for u in users]

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    total_users = len(users)
    
    total_emp = sum(1 for u in users if u.role in ["Employee", "Field Worker"])
    total_off = sum(1 for u in users if u.role in ["Officer", "Safety Officer"])
    total_mgr = sum(1 for u in users if u.role in ["Manager", "Safety Manager"])
    total_adm = sum(1 for u in users if u.role == "Admin")
    
    pending_approvals = sum(1 for u in users if u.approval_status == "Pending")
    approved_users = sum(1 for u in users if u.approval_status == "Approved")
    rejected_users = sum(1 for u in users if u.approval_status == "Rejected")
    active_users = sum(1 for u in users if u.is_active)
    deactivated_users = sum(1 for u in users if not u.is_active)

    reports = db.query(IncidentReport).all()
    total_reports = len(reports)

    # Issue breakdown
    issue_counts: Dict[str, int] = {}
    for r in reports:
        cat = r.hazard_category or "Facility Hazard"
        issue_counts[cat] = issue_counts.get(cat, 0) + 1

    return {
        "kpis": {
            "total_employee": total_emp,
            "total_officer": total_off,
            "total_manager": total_mgr,
            "total_admin": total_adm,
            "total_users": total_users,
            "pending_approvals": pending_approvals,
            "approved_users": approved_users,
            "rejected_users": rejected_users,
            "active_users": active_users,
            "deactivated_users": deactivated_users,
            "total_reports": total_reports
        },
        "charts": {
            "role_distribution": [
                {"role": "Employee", "count": total_emp, "color": "#3B82F6"},
                {"role": "Officer", "count": total_off, "color": "#10B981"},
                {"role": "Manager", "count": total_mgr, "color": "#8B5CF6"},
                {"role": "Admin", "count": total_adm, "color": "#F59E0B"}
            ],
            "status_distribution": [
                {"status": "Approved", "count": approved_users, "color": "#10B981"},
                {"status": "Pending", "count": pending_approvals, "color": "#F59E0B"},
                {"status": "Rejected", "count": rejected_users, "color": "#EF4444"}
            ],
            "issue_distribution": [
                {"type": k, "count": v} for k, v in issue_counts.items()
            ][:6],
            "severity_distribution": [
                {"severity": "Critical", "count": sum(1 for r in reports if r.sif_potential == "Critical"), "color": "#EF4444"},
                {"severity": "High", "count": sum(1 for r in reports if r.sif_potential == "High"), "color": "#F97316"},
                {"severity": "Medium", "count": sum(1 for r in reports if r.sif_potential == "Medium"), "color": "#F59E0B"},
                {"severity": "Low", "count": sum(1 for r in reports if r.sif_potential == "Low"), "color": "#10B981"}
            ]
        }
    }

@router.get("/reports")
def list_admin_reports(limit: int = 200, db: Session = Depends(get_db)):
    reports = db.query(IncidentReport).order_by(IncidentReport.created_at.desc()).limit(limit).all()
    output = []
    for r in reports:
        output.append({
            "id": str(r.id),
            "report_code": r.report_code,
            "report_type": r.condition or "Unsafe Condition",
            "reporter_email": r.reporter_email or "worker@refinery.safe",
            "reviewer": r.manager_name or "HSE Reviewer",
            "assigned_team": r.assigned_officer_name or "Unassigned",
            "site": r.site,
            "unit": r.unit,
            "location": f"{r.site} - {r.unit}",
            "activity": r.hazard_category or "Operations",
            "description": r.raw_text,
            "hazard": r.hazard_category or "Hazard",
            "life_saving_rule": r.life_saving_rule or "Standard Rule",
            "risk_level": r.priority or "Medium",
            "sif_risk_score": r.risk_score or 50.0,
            "is_sif_precursor": "Yes" if r.sif_potential in ["High", "Critical"] else "No",
            "status": r.status,
            "action_status": r.officer_status or "None",
            "stop_work_issued": r.priority == "Critical",
            "photo_url": r.photo_url,
            "timestamp": r.timestamp or r.created_at.isoformat()
        })
    return output

@router.post("/approve-user")
def approve_user_alias(req: UserApprovalAction, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == req.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if req.action == "reject":
        target.approval_status = "Rejected"
    else:
        target.approval_status = "Approved"
        target.is_active = True
    db.commit()
    return {"success": True, "message": f"User {target.email} status updated to {target.approval_status}"}

@router.post("/users/{user_id}/approve")
def approve_user(user_id: int, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.approval_status = "Approved"
    target.is_active = True

    audit = AuditLog(
        user_email="admin@refinery.safe",
        user_role="Admin",
        action="USER_APPROVED",
        details=f"Approved registration for {target.name} ({target.email}) with role {target.role}"
    )
    db.add(audit)

    notif = Notification(
        recipient_email=target.email,
        recipient_role=target.role,
        title="Account Approved",
        message=f"Welcome {target.name}! Your account has been approved by the Administrator."
    )
    db.add(notif)
    db.commit()
    db.refresh(target)
    return serialize_user_for_admin(target)

@router.post("/users/{user_id}/reject")
async def reject_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    target.approval_status = "Rejected"
    reason = body.get("reason", "Registration rejected by Administrator.")

    audit = AuditLog(
        user_email="admin@refinery.safe",
        user_role="Admin",
        action="USER_REJECTED",
        details=f"Rejected registration for {target.email}. Reason: {reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(target)
    return serialize_user_for_admin(target)

@router.post("/users/{user_id}/toggle-active")
def toggle_active_user(user_id: int, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.is_active = not target.is_active
    audit = AuditLog(
        user_email="admin@refinery.safe",
        user_role="Admin",
        action="USER_STATUS_TOGGLED",
        details=f"User {target.email} active status toggled to {target.is_active}"
    )
    db.add(audit)
    db.commit()
    db.refresh(target)
    return serialize_user_for_admin(target)

@router.post("/users/{user_id}/change-role")
@router.patch("/users/{user_id}/role")
async def change_user_role(user_id: int, request: Request, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    body = await request.json()
    new_role = body.get("role", target.role)
    old_role = target.role
    target.role = new_role

    audit = AuditLog(
        user_email="admin@refinery.safe",
        user_role="Admin",
        action="USER_ROLE_CHANGED",
        details=f"Role changed for {target.email} from {old_role} to {new_role}"
    )
    db.add(audit)
    db.commit()
    db.refresh(target)
    return serialize_user_for_admin(target)

@router.delete("/users/{user_id}")
def delete_admin_user(user_id: int, db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(target)
    db.commit()
    return {"success": True, "message": f"User {user_id} deleted"}

@router.delete("/reports/{identifier}")
def delete_admin_report(identifier: str, db: Session = Depends(get_db)):
    clean_id = identifier.replace("#", "")
    target = db.query(IncidentReport).filter(
        (IncidentReport.report_code == clean_id) |
        (IncidentReport.report_code == f"#{clean_id}") |
        (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
    ).first()

    if target:
        db.delete(target)
        db.commit()
    return {"success": True, "deleted": identifier}

@router.post("/reports/batch-delete")
async def batch_delete_reports(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    codes = body.get("report_codes", [])
    for code in codes:
        clean_id = code.replace("#", "")
        target = db.query(IncidentReport).filter(
            (IncidentReport.report_code == clean_id) |
            (IncidentReport.report_code == f"#{clean_id}") |
            (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
        ).first()
        if target:
            db.delete(target)
    db.commit()
    return {"success": True, "count": len(codes)}

@router.get("/audit-logs")
def list_admin_audit_logs(limit: int = 300, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    output = []
    for log in logs:
        actor_name = "System"
        if log.actor_name:
            actor_name = log.actor_name
        elif log.user_email and "@" in str(log.user_email):
            actor_name = str(log.user_email).split("@")[0].capitalize()
        elif log.user_email:
            actor_name = str(log.user_email)

        timestamp_str = ""
        if log.timestamp:
            timestamp_str = log.timestamp.isoformat() if hasattr(log.timestamp, "isoformat") else str(log.timestamp)

        output.append({
            "id": log.id,
            "event_id": f"AUD-{log.id:04d}",
            "action": log.action or "SYSTEM_EVENT",
            "actor_name": actor_name,
            "actor_role": log.user_role or log.actor_role or "System",
            "details": log.details or "",
            "user_email": log.user_email or "",
            "timestamp": timestamp_str
        })
    return output
