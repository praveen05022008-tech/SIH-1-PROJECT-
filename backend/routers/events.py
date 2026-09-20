import random
import string
from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from models import IncidentReport, User, Notification, AuditLog
from schemas import IncidentCreateRequest, SifAnalyzeRequest
from auth import get_current_user
from services.sif_service import analyze_sif_report, extract_condition_type, extract_hazard_category

router = APIRouter(prefix="/api/events", tags=["Events & Reports"])

def report_to_event_dict(r: IncidentReport) -> dict:
    return {
        "id": r.report_code or f"EVT-{r.id}",
        "report_id": r.id,
        "report_code": r.report_code,
        "raw_text": r.raw_text,
        "audio_transcript": r.audio_transcript,
        "audio_url": r.audio_url,
        "photo_url": r.photo_url,
        "reporter_name": r.reporter_name or "Frontline Employee",
        "reporter_email": r.reporter_email or "worker@refinery.safe",
        "hazard_category": r.hazard_category or "Operational Facility Hazard",
        "shift_timing": r.shift_timing or "Shift A",
        "location_detail": r.location_detail or "Primary Facility",
        "site": r.site or "Site Alpha - Jamnagar Complex",
        "unit": r.unit or "Unit 04 - FCCU",
        "location": r.location or f"{r.site or 'Site Alpha'} - {r.unit or 'Unit 04'}",
        "location_detail": r.location_detail,
        "activity": r.hazard_category or "Routine Maintenance & Operation",
        "description": r.raw_text,
        "hazard": r.hazard_category or "Identified Site Hazard",
        "hazard_category": r.hazard_category,
        "people_involved": r.people_involved or 1,
        "equipment_involved": r.equipment_involved,
        "timestamp": r.timestamp or r.created_at.isoformat(),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        
        # SIF YES/NO & Classification Standard
        "status": r.status,
        "priority": r.priority,
        "sif_potential": r.sif_potential,
        "is_sif_potential": "YES" if r.sif_potential in ["High", "Critical"] or r.actual_injury in ["Fatal injury", "Severe / Lost Time Injury"] else "NO",
        "is_sif_precursor": "YES" if r.sif_potential in ["High", "Critical"] or r.actual_injury in ["Fatal injury", "Severe / Lost Time Injury"] else "NO",
        "sif_category": "Category 1 – SIF Incident (Actual SIF)" if r.actual_injury in ["Fatal injury", "Severe / Lost Time Injury"] else ("Category 2 – SIF Precursor" if r.sif_potential in ["High", "Critical"] else "Category 3 – Non-SIF"),
        "condition": r.condition,
        "event": r.event,
        "actual_injury": r.actual_injury,
        "energy_source": r.energy_source or "Mechanical / Gravitational Potential",
        "barrier": r.barrier or "Engineered Safeguard / Standard PPE",
        "barrier_failure": r.barrier_failure or "Barrier compromised or absent",
        "exposure": r.exposure or "Personnel within hazard strike zone",
        "consequence": r.consequence or "Severe injury or facility impact",
        "life_saving_rule": r.life_saving_rule or "Follow standard safety operating procedures",
        "classification": r.classification or ("SIF Precursor / High-Risk Facility Condition" if r.sif_potential in ["High", "Critical"] else "Low-Potential Observation / Non-SIF"),
        
        # Scores
        "risk_score": r.risk_score or 50.0,
        "sif_risk_score": round(r.risk_score / 10.0, 1) if r.risk_score else (round(r.severity_score, 1) if r.severity_score else 2.5),
        "risk_level": "CRITICAL" if r.sif_potential == "Critical" else ("HIGH" if r.sif_potential == "High" else ("MEDIUM" if r.sif_potential == "Medium" else "LOW")),
        "severity_score": r.severity_score,
        "exposure_score": r.exposure_score,
        "barrier_score": r.barrier_score,
        "sif_probability": round(r.risk_score / 100.0, 2) if r.risk_score else 0.5,
        "confidence": r.ai_confidence or 94.0,
        "ai_confidence": r.ai_confidence or 94.0,
        "evidence": r.ai_rationale or "Evaluated by Groq AI & SIF Category 3 Engine",
        "ai_rationale": r.ai_rationale or "Evaluated by Groq AI & SIF Category 3 Engine",
        "reviewer": r.manager_name or r.assigned_officer_name,
        
        # Workflow
        "assigned_officer_id": r.assigned_officer_id,
        "assigned_officer_name": r.assigned_officer_name,
        "manager_id": r.manager_id,
        "manager_name": r.manager_name,
        "officer_status": r.officer_status,
        "officer_notes": r.officer_notes,
        "recheck_notes": r.recheck_notes,
        "rejection_reason": r.rejection_reason
    }

@router.get("")
def list_events(
    reporter_email: Optional[str] = None,
    assigned_officer_id: Optional[int] = None,
    assigned_officer_name: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    hazard_category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(IncidentReport)
    if reporter_email:
        query = query.filter(IncidentReport.reporter_email == reporter_email)
    if assigned_officer_id:
        query = query.filter(IncidentReport.assigned_officer_id == assigned_officer_id)
    if assigned_officer_name:
        query = query.filter(IncidentReport.assigned_officer_name == assigned_officer_name)
    if status:
        query = query.filter(IncidentReport.status == status)
    if priority:
        query = query.filter(IncidentReport.priority == priority)
    if hazard_category:
        query = query.filter(IncidentReport.hazard_category == hazard_category)
        
    reports = query.order_by(IncidentReport.created_at.desc()).all()
    return [report_to_event_dict(r) for r in reports]

@router.post("/analyze/raw")
def analyze_raw_text(payload: dict):
    text = payload.get("text", "")
    if not text or len(text.strip()) == 0:
        return {
            "condition": "Unsafe Condition",
            "report_type": "Unsafe Condition",
            "event": "Operational facility hazard",
            "activity": "Routine Maintenance & Operation",
            "location": "Process Unit Area",
            "actual_injury": "None",
            "sif_potential": "Low",
            "is_sif_potential": "NO",
            "is_sif_precursor": "NO",
            "sif_category": "Category 3 – Non-SIF",
            "classification": "Low-Potential Observation / Non-SIF",
            "life_saving_rule": "Standard Operating Safeguards",
            "confidence": 90.0,
            "ai_confidence": 90.0,
            "risk_score": 22.0,
            "rationale": "Awaiting safety report observation text.",
            "matched_words": []
        }
    analysis = analyze_sif_report(text)
    return {
        "condition": analysis.get("condition", "Unsafe Condition"),
        "report_type": analysis.get("condition", "Unsafe Condition"),
        "category": analysis.get("hazard_category", "Operational Facility Hazard"),
        "hazard_category": analysis.get("hazard_category", "Operational Facility Hazard"),
        "event": analysis.get("event", "Operational facility hazard"),
        "activity": analysis.get("activity", "Routine Maintenance & Operation"),
        "location": analysis.get("location", "Process Unit Area"),
        "actual_injury": analysis.get("actual_injury", "None"),
        "sif_potential": analysis.get("sif_potential", "Low"),
        "is_sif_potential": analysis.get("is_sif_potential", "NO"),
        "is_sif_precursor": analysis.get("is_sif_precursor", "NO"),
        "sif_category": analysis.get("sif_category", "Category 3 – Non-SIF"),
        "classification": analysis.get("classification", "Low-Potential Observation / Non-SIF"),
        "risk_score": analysis.get("risk_score", 25.0),
        "confidence": analysis.get("ai_confidence", 94.0),
        "ai_confidence": analysis.get("ai_confidence", 94.0),
        "rationale": analysis.get("ai_rationale", ""),
        "ai_rationale": analysis.get("ai_rationale", ""),
        "matched_words": analysis.get("matched_words", [w for w in text.split() if len(w) > 3][:5]),
        "energy_source": analysis.get("energy_source", ""),
        "barrier": analysis.get("barrier", ""),
        "barrier_failure": analysis.get("barrier_failure", ""),
        "life_saving_rule": analysis.get("life_saving_rule", "Standard Operating Safeguards")
    }

@router.post("")
def create_event_report(
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    analysis_input = req.audio_transcript or req.raw_text
    ai_data = analyze_sif_report(analysis_input)

    random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    code = f"RPT-JAM-{datetime.utcnow().strftime('%y%m%d')}-{random_str}"

    reporter_email = req.reporter_email or (user.email if user else "worker@refinery.safe")
    reporter_name = req.reporter_name or (user.name if user else "Frontline Employee")

    report = IncidentReport(
        id=code,
        report_code=code,
        raw_text=req.raw_text,
        description=req.raw_text,
        audio_transcript=req.audio_transcript or req.raw_text,
        audio_url=req.audio_url,
        photo_url=req.photo_url,
        reporter_id=user.id if user else None,
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

    # Send Notification to Manager
    notif = Notification(
        recipient_role="Manager",
        title=f"New SIF Alert: {report.report_code}",
        message=f"New report '{report.hazard_category}' with SIF potential {report.sif_potential} (Risk Score: {report.risk_score}) submitted by {reporter_name}.",
        report_id=report.id,
        report_code=report.report_code
    )
    db.add(notif)
    db.commit()

    return report_to_event_dict(report)

@router.post("/analyze")
def analyze_incident(
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user)
):
    # Delegate to report creation to persist and return full analyzed report
    return create_event_report(req, db, user)

@router.get("/{event_id}")
def get_event(event_id: str, db: Session = Depends(get_db)):
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == event_id) | (IncidentReport.id == int(event_id) if event_id.isdigit() else False)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Safety event not found")
    return report_to_event_dict(report)

@router.post("/{event_id}/ai-analyze")
def trigger_ai_reanalyze(event_id: str, db: Session = Depends(get_db)):
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == event_id) | (IncidentReport.id == int(event_id) if event_id.isdigit() else False)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Safety event not found")

    analysis = analyze_sif_report(report.raw_text)
    report.sif_potential = analysis.get("sif_potential", report.sif_potential)
    report.risk_score = analysis.get("risk_score", report.risk_score)
    report.ai_rationale = analysis.get("ai_rationale", report.ai_rationale)
    db.commit()
    db.refresh(report)
    return report_to_event_dict(report)

@router.post("/{event_id}/review")
async def review_event(event_id: str, request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == event_id) | (IncidentReport.id == int(event_id) if event_id.isdigit() else False)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Safety event not found")

    if "status" in body:
        report.status = body["status"]
    if "sif_potential" in body:
        report.sif_potential = body["sif_potential"]
    if "reviewer" in body:
        report.manager_name = body["reviewer"]

    db.commit()
    db.refresh(report)
    return report_to_event_dict(report)

@router.post("/{event_id}/action")
async def action_event(event_id: str, request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    report = db.query(IncidentReport).filter(
        (IncidentReport.report_code == event_id) | (IncidentReport.id == int(event_id) if event_id.isdigit() else False)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Safety event not found")

    report.status = body.get("status", "Action Dispatched")
    if "action_notes" in body:
        report.officer_notes = body["action_notes"]

    db.commit()
    db.refresh(report)
    return report_to_event_dict(report)
