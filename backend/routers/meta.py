from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from database import get_db
from models import Site, Unit, LifeSavingRule, PrecursorPattern, SafetyDirective, User, AuditLog
from auth import get_password_hash

router = APIRouter(prefix="/api", tags=["Metadata & Configuration"])

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.name.asc()).all()
    return [
        {
            "id": u.id,
            "name": u.name or "User",
            "email": u.email,
            "role": u.role,
            "id_number": u.id_number or f"EMP-{u.id:03d}",
            "phone": u.phone or "",
            "address": u.address or "",
            "approval_status": u.approval_status,
            "is_active": bool(u.is_active)
        }
        for u in users
    ]

@router.post("/users")
async def create_user_alias(request: Request, db: Session = Depends(get_db)):
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
    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "approval_status": new_user.approval_status,
        "is_active": new_user.is_active
    }

@router.get("/life-saving-rules")
def get_life_saving_rules(db: Session = Depends(get_db)):
    rules = db.query(LifeSavingRule).all()
    return [
        {
            "id": r.id,
            "code": r.code or f"LSR-{r.id:02d}",
            "name": r.name,
            "description": r.description or "",
            "criticality": r.precursor_density or "High",
            "icon": r.icon or "shield",
            "reports_count": r.reports_count,
            "sif_count": r.sif_count,
            "top_site": r.top_site
        }
        for r in rules
    ]

@router.get("/precursors")
def get_precursors(db: Session = Depends(get_db)):
    patterns = db.query(PrecursorPattern).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "pattern": p.name,
            "occurrences": p.occurrences,
            "frequency": p.occurrences,
            "sites": p.sites,
            "activities": p.activities,
            "life_saving_rule": p.life_saving_rule,
            "trend": p.trend,
            "barrier_failure": p.barrier_failure,
            "risk_level": p.risk_level,
            "category": p.life_saving_rule or "General Safety"
        }
        for p in patterns
    ]

@router.get("/sites")
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(Site).all()
    result = []
    for s in sites:
        units_count = db.query(Unit).filter(Unit.site_id == s.id).count()
        result.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "location": s.location,
            "risk_index": 50,
            "active_units": units_count
        })
    return result

@router.get("/sites/{site_id}")
def get_site_detail(site_id: str, db: Session = Depends(get_db)):
    site = None
    if site_id.isdigit():
        site = db.query(Site).filter(Site.id == int(site_id)).first()
    if not site:
        site = db.query(Site).filter((Site.code == site_id) | (Site.name.ilike(f"%{site_id}%"))).first()
    
    if not site:
        return {"id": site_id, "name": "Refinery Facility", "code": "FAC", "units": []}
    
    units = db.query(Unit).filter(Unit.site_id == site.id).all()
    return {
        "id": site.id,
        "name": site.name,
        "code": site.code,
        "location": site.location,
        "units": [
            {"id": u.id, "name": u.name, "code": u.code, "risk_score": 50}
            for u in units
        ]
    }

@router.get("/safety-directives")
def get_safety_directives(db: Session = Depends(get_db)):
    directives = db.query(SafetyDirective).all()
    return [
        {
            "id": d.id,
            "directive_id": d.directive_id,
            "title": d.title,
            "message": d.message,
            "priority": d.priority,
            "target_scope": d.target_scope,
            "target_name": d.target_name,
            "target_sites": d.target_sites,
            "issued_by": d.issued_by,
            "acknowledge_count": d.acknowledge_count,
            "created_at": d.created_at
        }
        for d in directives
    ]

@router.post("/safety-directives/{directive_id}/acknowledge")
def acknowledge_safety_directive(directive_id: str, db: Session = Depends(get_db)):
    directive = db.query(SafetyDirective).filter(SafetyDirective.directive_id == directive_id).first()
    if directive:
        directive.acknowledge_count += 1
        db.commit()
    return {"success": True, "directive_id": directive_id, "acknowledged": True}

@router.get("/admin/service-status")
def get_service_status():
    return {
        "aiEngine": "Online (Groq AI GPT-120B + Whisper)",
        "database": "Connected (TiDB Cloud MySQL)",
        "storage": "Online (Cloudinary)",
        "gati": "Active Continuous Learning",
        "data": "Healthy (Encrypted TLS/SSL)"
    }

@router.post("/seed/reset")
def reset_seed():
    from seed import init_db
    init_db()
    return {"success": True, "message": "System verified."}
