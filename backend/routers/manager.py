from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import IncidentReport, User, Notification, AuditLog
from auth import get_current_user
from config import settings

router = APIRouter(prefix="/api", tags=["Manager & Officer Workflow"])

def report_to_task_dict(r: IncidentReport) -> dict:
    score_10 = round(r.risk_score / 10.0, 1) if r.risk_score else (round(r.severity_score, 1) if r.severity_score else 2.5)
    return {
        "task_id": f"TSK-{r.report_code or r.id}",
        "id": r.id,
        "report_id": r.id,
        "report_code": r.report_code,
        "title": f"Investigation: {r.hazard_category or 'Site Hazard'}",
        "description": r.raw_text,
        "raw_text": r.raw_text,
        "audio_transcript": r.audio_transcript,
        "audio_url": r.audio_url,
        "photo_url": r.photo_url,
        "hazard_category": r.hazard_category,
        "site": r.site or "Site Alpha - Jamnagar Complex",
        "unit": r.unit or "Unit 04 - FCCU",
        "location_detail": r.location_detail,
        "location": f"{r.site} - {r.unit}" if r.site and r.unit else (r.location_detail or "Field Site"),
        "reporter_name": r.reporter_name or "Frontline Employee",
        "reporter_email": r.reporter_email or "worker@refinery.safe",
        "priority": r.priority,
        "sif_potential": r.sif_potential,
        "risk_score": r.risk_score,
        "sif_risk_score": score_10,
        "risk_level": "CRITICAL" if r.sif_potential == "Critical" else ("HIGH" if r.sif_potential == "High" else ("MEDIUM" if r.sif_potential == "Medium" else "LOW")),
        "status": r.status, # 'Assigned', 'In Progress', 'Recheck', 'Completed', 'Rejected'
        "officer_status": r.officer_status, # 'Pending', 'Accepted', 'Rejected', 'Forwarded_Recheck', 'Completed'
        
        "assigned_to": r.assigned_officer_name or "Unassigned",
        "assigned_officer_id": r.assigned_officer_id,
        "assigned_officer_name": r.assigned_officer_name,
        "officer_email": "officer@refinery.safe",
        "assigned_by": r.manager_name or "HSE Manager",
        
        "assigned_date": r.assigned_at.isoformat() if r.assigned_at else (r.created_at.isoformat() if r.created_at else None),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "due_date": (r.created_at + timedelta(days=2)).isoformat() if r.created_at else None,
        
        "officer_notes": r.officer_notes,
        "rejection_reason": r.rejection_reason,
        "recheck_notes": r.recheck_notes,
        "is_recheck_ready": r.status == "Recheck" or r.officer_status == "Forwarded_Recheck",
        "evidence": r.ai_rationale,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None
    }

@router.get("/manager/officers")
def list_available_officers(db: Session = Depends(get_db)):
    officers = db.query(User).filter(
        (User.role.in_(["Officer", "Safety Officer"])) &
        (User.approval_status == "Approved")
    ).all()
    
    # If no approved officer found yet, query all officers or fallback
    if not officers:
        officers = db.query(User).filter(
            User.role.in_(["Officer", "Safety Officer"])
        ).all()

    if not officers:
        return [
            {"id": 101, "name": "Rajesh Kumar", "officer_name": "Rajesh Kumar", "email": "rajesh.kumar@refinery.safe", "role": "Safety Officer", "id_number": "EMP-301", "site": "Site Alpha - Jamnagar Complex", "status": "Available"},
            {"id": 102, "name": "Priya Sharma", "officer_name": "Priya Sharma", "email": "priya.sharma@refinery.safe", "role": "Safety Officer", "id_number": "EMP-302", "site": "Site Beta - Barmer Block", "status": "Available"},
            {"id": 103, "name": "Amit Patel", "officer_name": "Amit Patel", "email": "amit.patel@refinery.safe", "role": "Safety Officer", "id_number": "EMP-303", "site": "Offshore Platform KG-D6", "status": "Available"},
        ]
    return [
        {
            "id": u.id,
            "name": u.name,
            "officer_name": u.name,
            "email": u.email,
            "role": u.role,
            "id_number": u.id_number or f"EMP-{u.id}",
            "site": u.address or "Refinery Area",
            "status": "Available" if u.is_active else "Offline"
        }
        for u in officers
    ]

@router.get("/manager/tasks")
def list_manager_tasks(
    officer_email: Optional[str] = None,
    officer_id: Optional[int] = None,
    officer_name: Optional[str] = None,
    status: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    query = db.query(IncidentReport)
    
    # Check headers for officer isolation
    req_email = officer_email or (request.headers.get("X-User-Email") if request else None)
    req_id_str = request.headers.get("X-User-Id") if request else None
    req_id = officer_id or (int(req_id_str) if req_id_str and req_id_str.isdigit() else None)
    req_role = request.headers.get("X-User-Role") if request else None

    # Apply strict officer isolation if caller is an officer
    if req_id:
        query = query.filter(IncidentReport.assigned_officer_id == req_id)
    elif req_email and (req_role in ["Officer", "Safety Officer"]):
        officer_user = db.query(User).filter(User.email == req_email).first()
        if officer_user:
            query = query.filter(
                (IncidentReport.assigned_officer_id == officer_user.id) |
                (IncidentReport.assigned_officer_name.ilike(f"%{officer_user.name}%"))
            )
        else:
            query = query.filter(IncidentReport.assigned_officer_name.ilike(f"%{req_email}%"))
    elif officer_name:
        query = query.filter(IncidentReport.assigned_officer_name.ilike(f"%{officer_name}%"))

    if status:
        query = query.filter(IncidentReport.status == status)

    reports = query.order_by(IncidentReport.risk_score.desc(), IncidentReport.created_at.desc()).all()
    return [report_to_task_dict(r) for r in reports]

@router.post("/manager/tasks")
async def create_or_assign_task(request: Request, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user)):
    body = await request.json()
    report_code = body.get("report_code") or body.get("id") or body.get("report_id") or body.get("related_event_id")
    
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == str(report_code)) | 
        (IncidentReport.id == int(report_code) if str(report_code).isdigit() else False)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")

    is_self = body.get("is_self_assignment", False)
    officer_name = body.get("assigned_officer_name") or body.get("assigned_to") or body.get("officer_name") or "Safety Officer"
    officer_id = body.get("assigned_officer_id")

    report.manager_id = user.id if user else 1
    report.manager_name = user.name if user else "Safety Manager"
    report.assigned_at = datetime.utcnow()
    report.unwatched_alert_sent = False

    if is_self:
        report.assigned_officer_id = report.manager_id
        report.assigned_officer_name = f"{report.manager_name} (Self-Assigned)"
        report.status = "In Progress"
        report.officer_status = "Accepted"
    else:
        report.assigned_officer_id = officer_id
        report.assigned_officer_name = officer_name
        report.status = "Assigned"
        report.officer_status = "Pending"

    db.commit()
    db.refresh(report)
    return report_to_task_dict(report)

@router.api_route("/manager/tasks/{task_id}", methods=["PUT", "PATCH", "POST", "GET"])
async def update_task_status(task_id: str, request: Request, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user)):
    clean_id = task_id.replace("TSK-", "")
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == clean_id) | (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Task not found")

    if request.method == "GET":
        return report_to_task_dict(report)

    body = await request.json()
    action = body.get("action", "").lower()
    
    if action == "accept" or body.get("status") == "In Progress":
        report.status = "In Progress"
        report.officer_status = "Accepted"
        if body.get("findings"):
            report.officer_notes = body.get("findings")
    elif action == "reject":
        # Officer rejects -> returns to unassigned
        report.status = "Pending Review"
        report.officer_status = "Rejected"
        report.rejection_reason = body.get("rejection_reason") or body.get("notes") or "Officer busy"
        report.assigned_officer_id = None
        report.assigned_officer_name = None
    elif action == "submit-recheck" or action == "forward_recheck" or body.get("status") in ["Recheck", "Submitted"]:
        report.status = "Recheck"
        report.officer_status = "Forwarded_Recheck"
        report.officer_notes = body.get("findings") or body.get("officer_notes") or "Corrective action completed."
    elif body.get("status"):
        report.status = body.get("status")
        if body.get("findings"):
            report.officer_notes = body.get("findings")

    db.commit()
    db.refresh(report)
    return report_to_task_dict(report)

@router.api_route("/officer/tasks/{task_id}/submit-recheck", methods=["POST", "PUT", "PATCH"])
async def submit_officer_recheck(task_id: str, request: Request, db: Session = Depends(get_db)):
    clean_id = task_id.replace("TSK-", "")
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == clean_id) | (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Task not found")

    body = await request.json()
    report.status = "Recheck"
    report.officer_status = "Forwarded_Recheck"
    report.officer_notes = body.get("findings") or body.get("actions_taken") or body.get("notes") or "Corrective actions completed and submitted for sign-off."

    db.commit()
    db.refresh(report)
    return report_to_task_dict(report)

@router.api_route("/manager/tasks/{task_id}/approve", methods=["POST", "PUT", "PATCH"])
async def approve_manager_task(task_id: str, request: Request, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user)):
    clean_id = task_id.replace("TSK-", "")
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == clean_id) | (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Task not found")

    body = await request.json() if request.headers.get("content-length") else {}
    report.status = "Completed"
    report.officer_status = "Completed"
    report.recheck_notes = body.get("manager_notes") or body.get("notes") or "Approved and marked Completed by Safety Manager."
    report.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(report)
    return report_to_task_dict(report)

@router.api_route("/manager/tasks/{task_id}/reject", methods=["POST", "PUT", "PATCH"])
async def reject_manager_task(task_id: str, request: Request, db: Session = Depends(get_db)):
    clean_id = task_id.replace("TSK-", "")
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == clean_id) | (IncidentReport.id == int(clean_id) if clean_id.isdigit() else False)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Task not found")

    body = await request.json()
    reason = body.get("rejection_reason") or body.get("reason") or body.get("notes") or "Sent back for rework"
    report.status = "In Progress"
    report.officer_status = "Accepted"
    report.recheck_notes = f"Manager Feedback: {reason}"

    db.commit()
    db.refresh(report)
    return report_to_task_dict(report)

@router.get("/manager/directives")
def get_manager_directives():
    return [
        {
            "directive_id": "DIR-001",
            "title": "Mandatory 100% Tie-Off at Elevated Platforms > 1.8m",
            "issued_by": "HSE Directorate",
            "priority": "Critical",
            "date": "2026-09-15"
        },
        {
            "directive_id": "DIR-002",
            "title": "Flange Management Pre-Startup Leak Checks on FCCU Line 3",
            "issued_by": "Process Safety Lead",
            "priority": "High",
            "date": "2026-09-16"
        }
    ]

@router.post("/manager/directives/{directive_id}/acknowledge")
def ack_directive(directive_id: str):
    return {"success": True, "directive_id": directive_id, "acknowledged": True}
