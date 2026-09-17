from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'Employee', 'Officer', 'Manager', 'Admin'
    id_number = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    approval_status = Column(String(50), default="Pending", nullable=False) # 'Pending', 'Approved', 'Rejected'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_code = Column(String(100), unique=True, index=True, nullable=False)
    raw_text = Column(Text, nullable=False)
    audio_transcript = Column(Text, nullable=True)
    audio_url = Column(String(1000), nullable=True)
    photo_url = Column(String(1000), nullable=True)
    
    # Reporter details
    reporter_id = Column(Integer, nullable=True)
    reporter_name = Column(String(255), nullable=True)
    reporter_email = Column(String(255), index=True, nullable=True)
    
    # Location & Context
    hazard_category = Column(String(100), nullable=True)
    shift_timing = Column(String(100), nullable=True)
    location_detail = Column(String(255), nullable=True)
    site = Column(String(100), default="Site Alpha - Jamnagar Complex")
    unit = Column(String(100), default="Unit 04 - FCCU")
    people_involved = Column(Integer, default=1)
    equipment_involved = Column(String(255), nullable=True)
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)

    # Status & Priority
    # Status: 'Pending Review', 'Assigned', 'In Progress', 'Recheck', 'Completed', 'Rejected'
    status = Column(String(50), default="Pending Review", index=True)
    priority = Column(String(50), default="Medium") # 'Critical', 'High', 'Medium', 'Low'
    
    # SIF 3-Condition & AI Analysis
    sif_potential = Column(String(50), default="Low") # 'Critical', 'High', 'Medium', 'Low'
    condition = Column(String(100), default="Unsafe Condition") # 'Unsafe Act', 'Unsafe Condition', 'Near Miss'
    event = Column(String(255), default="Operational Hazard")
    actual_injury = Column(String(100), default="None")
    energy_source = Column(String(255), nullable=True) # Condition 1: High Energy Source
    barrier = Column(String(255), nullable=True)       # Barrier type
    barrier_failure = Column(String(255), nullable=True) # Condition 2: Barrier Failure
    exposure = Column(String(255), nullable=True)      # Condition 3: Fatal/Critical Exposure
    consequence = Column(String(255), nullable=True)
    life_saving_rule = Column(String(255), nullable=True)
    
    # Composite Risk Scores (0-10 and 0-100)
    risk_score = Column(Float, default=50.0)
    severity_score = Column(Float, default=5.0)
    exposure_score = Column(Float, default=5.0)
    barrier_score = Column(Float, default=5.0)
    ai_confidence = Column(Float, default=0.90)
    ai_rationale = Column(Text, nullable=True)

    # Workflow & Assignment
    manager_id = Column(Integer, nullable=True)
    manager_name = Column(String(255), nullable=True)
    assigned_officer_id = Column(Integer, nullable=True)
    assigned_officer_name = Column(String(255), nullable=True)
    
    # Officer response: 'Pending', 'Accepted', 'Rejected', 'Forwarded_Recheck', 'Completed'
    officer_status = Column(String(50), default="None")
    officer_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    recheck_notes = Column(Text, nullable=True)
    
    assigned_at = Column(DateTime, nullable=True)
    unwatched_alert_sent = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_role = Column(String(50), nullable=True) # 'Admin', 'Manager', 'Officer', 'Employee'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    report_id = Column(Integer, nullable=True)
    report_code = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
