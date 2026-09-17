import random
import string
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import IncidentReport, User, Notification, AuditLog
from schemas import (
    IncidentCreateRequest,
    IncidentAssignRequest,
    OfficerActionRequest,
    ManagerCompleteRequest,
    ManagerRejectRequest
)
from auth import get_current_user, require_auth, require_manager
from services.sif_service import analyze_sif_report
from config import settings

router = APIRouter(prefix="/api/reports", tags=["Safety Reports"])

def generate_report_code(site_prefix: str = "JAM") -> str:
    random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RPT-{site_prefix}-{datetime.utcnow().strftime('%y%m%d')}-{random_str}"

def serialize_report(r: IncidentReport) -> dict:
    if not r:
        return {}
    
    score_10 = round(r.risk_score / 10.0, 1) if r.risk_score else (round(r.severity_score, 1) if r.severity_score else 2.5)
    r_level = "CRITICAL" if r.sif_potential == "Critical" else ("HIGH" if r.sif_potential == "High" else ("MEDIUM" if r.sif_potential == "Medium" else "LOW"))

    return {
        "id": r.id,
        "report_id": r.id,
        "report_code": r.report_code,
        "raw_text": r.raw_text,
        "description": r.raw_text,
        "audio_transcript": r.audio_transcript,
        "audio_url": r.audio_url,
        "photo_url": r.photo_url,
        "reporter_id": r.reporter_id,
        "reporter_name": r.reporter_name,
        "reporter_email": r.reporter_email,
        "hazard_category": r.hazard_category,
        "hazard": r.hazard_category,
        "shift_timing": r.shift_timing,
        "location_detail": r.location_detail,
        "location": f"{r.site} - {r.unit}" if r.site and r.unit else (r.location_detail or "Primary Facility"),
        "site": r.site,
        "unit": r.unit,
        "people_involved": r.people_involved,
        "equipment_involved": r.equipment_involved,
        "timestamp": r.timestamp or (r.created_at.isoformat() if r.created_at else None),
        "status": r.status,
        "priority": r.priority,
        "sif_potential": r.sif_potential,
        "condition": r.condition,
        "event": r.event,
        "actual_injury": r.actual_injury,
        "energy_source": r.energy_source,
        "barrier": r.barrier,
        "barrier_failure": r.barrier_failure,
        "exposure": r.exposure,
        "consequence": r.consequence,
        "life_saving_rule": r.life_saving_rule,
        "risk_score": r.risk_score,
        "sif_risk_score": score_10,
        "risk_level": r_level,
        "severity_score": r.severity_score,
        "exposure_score": r.exposure_score,
        "barrier_score": r.barrier_score,
        "ai_confidence": r.ai_confidence,
        "ai_rationale": r.ai_rationale,
        "manager_id": r.manager_id,
        "manager_name": r.manager_name,
        "assigned_officer_id": r.assigned_officer_id,
        "assigned_officer_name": r.assigned_officer_name,
        "officer_status": r.officer_status,
        "officer_notes": r.officer_notes,
        "rejection_reason": r.rejection_reason,
        "recheck_notes": r.recheck_notes,
        "assigned_at": r.assigned_at.isoformat() if r.assigned_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None
    }

@router.post("")
def create_safety_report(
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    analysis_input = req.audio_transcript or req.raw_text
    ai_data = analyze_sif_report(analysis_input)

    code = generate_report_code("JAM")

    reporter_email = req.reporter_email or (user.email if user else "worker@refinery.safe")
    reporter_name = req.reporter_name or (user.name if user else "Frontline Employee")
    reporter_id = user.id if user else None

    report = IncidentReport(
        report_code=code,
        raw_text=req.raw_text,
        audio_transcript=req.audio_transcript or req.raw_text,
        audio_url=req.audio_url,
        photo_url=req.photo_url,
        reporter_id=reporter_id,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        hazard_category=req.hazard_category or ai_data.get("hazard_category", "Operational Facility Hazard"),
        shift_timing=req.shift_timing or "Shift A (06:00 - 14:00)",
        location_detail=req.location_detail or req.location or "Primary Operating Area",
        site=req.site or "Site Alpha - Jamnagar Complex",
        unit=req.unit or "Unit 04 - FCCU",
        people_involved=req.people_involved or 1,
        equipment_involved=req.equipment_involved or "General Machinery",
        
        status="Pending Review",
        priority=req.sif_potential or ai_data.get("priority", "Medium"),
        sif_potential=req.sif_potential or ai_data.get("sif_potential", "Medium"),
        condition=req.condition or req.report_type or ai_data.get("condition", "Unsafe Condition"),
        event=req.event or ai_data.get("event", "Operational Facility Hazard"),
        actual_injury=req.actual_injury or ai_data.get("actual_injury", "None"),
        energy_source=req.energy_source or ai_data.get("energy_source"),
        barrier=req.barrier or ai_data.get("barrier"),
        barrier_failure=req.barrier_failure or ai_data.get("barrier_failure"),
        exposure=req.exposure or ai_data.get("exposure"),
        consequence=req.consequence or ai_data.get("consequence"),
        life_saving_rule=req.life_saving_rule or ai_data.get("life_saving_rule"),
        
        risk_score=req.risk_score or ai_data.get("risk_score", 50.0),
        severity_score=req.severity_score or ai_data.get("severity_score", 5.0),
        exposure_score=req.exposure_score or ai_data.get("exposure_score", 5.0),
        barrier_score=req.barrier_score or ai_data.get("barrier_score", 5.0),
        ai_confidence=req.ai_confidence or ai_data.get("ai_confidence", 94.0),
        ai_rationale=req.ai_rationale or ai_data.get("ai_rationale")
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Notify Manager of new incident
    notif = Notification(
        recipient_role="Manager",
        title=f"New SIF Alert: {report.report_code}",
        message=f"New report '{report.hazard_category}' with SIF potential {report.sif_potential} (Risk Score: {report.risk_score}) submitted by {reporter_name}.",
        report_id=report.id,
        report_code=report.report_code
    )
    db.add(notif)
    db.commit()

    return serialize_report(report)

@router.get("")
def list_safety_reports(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: Optional[bool] = False,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    query = db.query(IncidentReport)
    
    if status:
        query = query.filter(IncidentReport.status == status)
    if priority:
        query = query.filter(IncidentReport.priority == priority)
    if assigned_to_me and user:
        query = query.filter(IncidentReport.assigned_officer_id == user.id)

    reports = query.order_by(IncidentReport.risk_score.desc(), IncidentReport.created_at.desc()).all()
    return [serialize_report(r) for r in reports]

@router.get("/{report_id}")
def get_report_detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")
    return serialize_report(report)

@router.patch("/{report_id}/assign")
def assign_report(
    report_id: int,
    req: IncidentAssignRequest,
    db: Session = Depends(get_db),
    manager: User = Depends(require_manager)
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")

    report.manager_id = manager.id
    report.manager_name = manager.name
    report.assigned_at = datetime.utcnow()
    report.unwatched_alert_sent = False

    if req.priority:
        report.priority = req.priority

    if req.is_self_assignment:
        report.assigned_officer_id = manager.id
        report.assigned_officer_name = f"{manager.name} (Manager Self-Assigned)"
        report.status = "In Progress"
        report.officer_status = "Accepted"
        
        audit = AuditLog(
            user_email=manager.email,
            user_role=manager.role,
            action="REPORT_SELF_ASSIGNED",
            details=f"Manager {manager.name} self-assigned report {report.report_code}"
        )
        db.add(audit)
    else:
        report.assigned_officer_id = req.assigned_officer_id
        report.assigned_officer_name = req.assigned_officer_name or "Assigned Safety Officer"
        report.status = "Assigned"
        report.officer_status = "Pending"

        notif = Notification(
            recipient_email=None,
            recipient_role="Officer",
            title=f"Incident Assignment: {report.report_code}",
            message=f"Manager {manager.name} assigned you to investigate {report.report_code} ({report.hazard_category}).",
            report_id=report.id,
            report_code=report.report_code
        )
        db.add(notif)

        audit = AuditLog(
            user_email=manager.email,
            user_role=manager.role,
            action="REPORT_ASSIGNED_TO_OFFICER",
            details=f"Manager {manager.name} assigned report {report.report_code} to Officer {report.assigned_officer_name}"
        )
        db.add(audit)

    db.commit()
    db.refresh(report)
    return serialize_report(report)

@router.patch("/{report_id}/manager-reject")
def manager_reject_report(
    report_id: int,
    req: ManagerRejectRequest,
    db: Session = Depends(get_db),
    manager: User = Depends(require_manager)
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")

    report.status = "Rejected"
    report.rejection_reason = req.rejection_reason
    report.officer_status = "Rejected"

    audit = AuditLog(
        user_email=manager.email,
        user_role=manager.role,
        action="REPORT_REJECTED_BY_MANAGER",
        details=f"Manager {manager.name} rejected report {report.report_code}. Reason: {req.rejection_reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    return serialize_report(report)

@router.patch("/{report_id}/officer-action")
def officer_take_action(
    report_id: int,
    req: OfficerActionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth)
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")

    action = req.action.lower().strip()

    if action == "accept":
        report.status = "In Progress"
        report.officer_status = "Accepted"
        if req.officer_notes:
            report.officer_notes = req.officer_notes

        audit = AuditLog(
            user_email=user.email,
            user_role=user.role,
            action="OFFICER_ACCEPTED_ASSIGNMENT",
            details=f"Officer {user.name} accepted assignment for {report.report_code}"
        )
        db.add(audit)

    elif action == "reject":
        report.status = "Pending Review"
        report.officer_status = "Rejected"
        report.rejection_reason = req.rejection_reason or "Officer busy / unable to accept task"
        report.assigned_officer_id = None
        report.assigned_officer_name = None

        notif = Notification(
            recipient_role="Manager",
            title=f"Assignment Rejected: {report.report_code}",
            message=f"Officer {user.name} rejected assignment for {report.report_code}. Report returned to unassigned pool.",
            report_id=report.id,
            report_code=report.report_code
        )
        db.add(notif)

        audit = AuditLog(
            user_email=user.email,
            user_role=user.role,
            action="OFFICER_REJECTED_ASSIGNMENT",
            details=f"Officer {user.name} rejected report {report.report_code}. Reason: {report.rejection_reason}"
        )
        db.add(audit)

    elif action == "forward_recheck":
        report.status = "Recheck"
        report.officer_status = "Forwarded_Recheck"
        report.officer_notes = req.officer_notes or req.actions_taken or "Mitigation actions completed. Forwarded to Manager for Recheck."

        notif = Notification(
            recipient_role="Manager",
            title=f"Ready for Recheck: {report.report_code}",
            message=f"Officer {user.name} submitted resolution for {report.report_code}. Please verify and sign off.",
            report_id=report.id,
            report_code=report.report_code
        )
        db.add(notif)

        audit = AuditLog(
            user_email=user.email,
            user_role=user.role,
            action="OFFICER_FORWARDED_TO_RECHECK",
            details=f"Officer {user.name} completed actions and forwarded {report.report_code} to Manager Recheck"
        )
        db.add(audit)

    db.commit()
    db.refresh(report)
    return serialize_report(report)

@router.patch("/{report_id}/manager-complete")
def manager_complete_recheck(
    report_id: int,
    req: ManagerCompleteRequest,
    db: Session = Depends(get_db),
    manager: User = Depends(require_manager)
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")

    if req.status == "Completed" or req.close_incident:
        report.status = "Completed"
        report.officer_status = "Completed"
        report.recheck_notes = req.recheck_notes or "Verified and marked as Completed by Safety Manager."
        report.completed_at = datetime.utcnow()

        audit = AuditLog(
            user_email=manager.email,
            user_role=manager.role,
            action="MANAGER_COMPLETED_REPORT",
            details=f"Manager {manager.name} verified and completed {report.report_code}"
        )
        db.add(audit)
    else:
        report.status = "In Progress"
        report.officer_status = "Accepted"
        report.recheck_notes = req.recheck_notes or "Requires additional corrective action."

        audit = AuditLog(
            user_email=manager.email,
            user_role=manager.role,
            action="MANAGER_REQUESTED_REWORK",
            details=f"Manager {manager.name} requested additional action on {report.report_code}"
        )
        db.add(audit)

    db.commit()
    db.refresh(report)
    return serialize_report(report)

@router.post("/check-unwatched")
def check_unwatched_assignments(db: Session = Depends(get_db)):
    cutoff_time = datetime.utcnow() - timedelta(seconds=settings.UNWATCHED_TIMEOUT_SECONDS)
    
    unwatched = db.query(IncidentReport).filter(
        IncidentReport.status == "Assigned",
        IncidentReport.officer_status == "Pending",
        IncidentReport.assigned_at < cutoff_time
    ).all()

    revoked_count = 0
    for r in unwatched:
        prev_officer = r.assigned_officer_name
        r.status = "Pending Review"
        r.officer_status = "Revoked"
        r.assigned_officer_id = None
        r.assigned_officer_name = None
        r.unwatched_alert_sent = True

        notif = Notification(
            recipient_role="Manager",
            title=f"Assignment Auto-Revoked: {r.report_code}",
            message=f"Report {r.report_code} was unwatched by {prev_officer} for over {settings.UNWATCHED_TIMEOUT_SECONDS // 60} minutes. Assignment revoked back to unassigned queue.",
            report_id=r.id,
            report_code=r.report_code
        )
        db.add(notif)
        revoked_count += 1

    db.commit()
    return {"revoked_count": revoked_count, "message": f"Processed {revoked_count} unwatched reports"}
