from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import IncidentReport, User, PrecursorPattern

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    total_reports = db.query(IncidentReport).count()
    pending_reports = db.query(IncidentReport).filter(IncidentReport.status == "Pending Review").count()
    assigned_reports = db.query(IncidentReport).filter(IncidentReport.status == "Assigned").count()
    in_progress = db.query(IncidentReport).filter(IncidentReport.status == "In Progress").count()
    recheck_queue = db.query(IncidentReport).filter(IncidentReport.status == "Recheck").count()
    completed = db.query(IncidentReport).filter(IncidentReport.status == "Completed").count()
    rejected = db.query(IncidentReport).filter(IncidentReport.status == "Rejected").count()

    critical_sif = db.query(IncidentReport).filter(IncidentReport.sif_potential == "Critical").count()
    high_sif = db.query(IncidentReport).filter(IncidentReport.sif_potential == "High").count()
    medium_sif = db.query(IncidentReport).filter(IncidentReport.sif_potential == "Medium").count()
    low_sif = db.query(IncidentReport).filter(IncidentReport.sif_potential == "Low").count()

    avg_risk = db.query(func.avg(IncidentReport.risk_score)).scalar() or 0.0

    return {
        "total_reports": total_reports,
        "pending_reports": pending_reports,
        "assigned_reports": assigned_reports,
        "in_progress": in_progress,
        "recheck_queue": recheck_queue,
        "completed": completed,
        "rejected": rejected,
        "sif_breakdown": {
            "critical": critical_sif,
            "high": high_sif,
            "medium": medium_sif,
            "low": low_sif
        },
        "average_risk_score": round(float(avg_risk), 1)
    }

sif_router = APIRouter(prefix="/api/sif", tags=["SIF Intelligence"])

@sif_router.get("")
@router.get("/sif")
def get_sif_intelligence(db: Session = Depends(get_db)):
    reports = db.query(IncidentReport).all()
    total = len(reports)
    sif_reports = [r for r in reports if r.sif_potential in ["High", "Critical", "Medium"]]
    sif_count = len(sif_reports)
    high_conf = len([r for r in reports if (r.ai_confidence or 90.0) >= 85.0])
    needs_review = len([r for r in reports if r.status in ["Pending Review", "Needs Review", "Pending"]])
    
    # Activity density mapping
    activity_map = {}
    for r in reports:
        act = r.hazard_category or "General Maintenance"
        if act not in activity_map:
            activity_map[act] = {"count": 0, "total_risk": 0.0}
        activity_map[act]["count"] += 1
        activity_map[act]["total_risk"] += (r.risk_score or 25.0)

    scatter_plot = []
    for act, data in activity_map.items():
        avg_dens = round(data["total_risk"] / max(data["count"], 1), 1)
        scatter_plot.append({
            "activity": act,
            "count": data["count"],
            "density": avg_dens
        })

    patterns = db.query(PrecursorPattern).all()
    top_precursors = [
        {
            "id": f"PAT-{p.id:02d}",
            "name": p.name,
            "occurrences": p.occurrences,
            "activities": p.activities or "Operations",
            "trend": p.trend or "Stable",
            "risk_level": p.risk_level or "MEDIUM",
            "life_saving_rule": p.life_saving_rule or "General Safety"
        }
        for p in patterns
    ]

    return {
        "sif_reports_count": sif_count,
        "high_confidence_count": high_conf,
        "needs_review_count": needs_review,
        "emerging_patterns_count": len(scatter_plot),
        "scatter_plot": scatter_plot,
        "top_precursors": top_precursors
    }
