from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# 1. Users Table
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

# 2. Sites Table
class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False, unique=True)
    location = Column(String(255), nullable=False)

# 3. Units Table
class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    site_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)

# 4. Safety Reports Table (Raw Reports & Observations)
class SafetyReport(Base):
    __tablename__ = "safety_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_code = Column(String(100), unique=True, index=True, nullable=True)
    report_type = Column(String(100), default="Unsafe Condition")
    raw_text = Column(Text, nullable=False)
    audio_transcript = Column(Text, nullable=True)
    photo_url = Column(String(1000), nullable=True)
    audio_url = Column(String(1000), nullable=True)
    reporter_id = Column(Integer, nullable=True)
    reporter_name = Column(String(255), nullable=True)
    reporter_email = Column(String(255), index=True, nullable=True)
    hazard_category = Column(String(100), nullable=True)
    shift_timing = Column(String(100), nullable=True)
    location_detail = Column(String(255), nullable=True)
    site = Column(String(100), default="Site Alpha - Jamnagar Complex")
    unit = Column(String(100), default="Unit 04 - FCCU")
    people_involved = Column(Integer, default=1)
    equipment_involved = Column(String(255), nullable=True)
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

# 5. Safety Events Table (Full SIF Classified & Workflow Events)
class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(String(100), primary_key=True, index=True) # e.g. "RPT-JAM-260916-YE29"
    report_id = Column(Integer, nullable=True)
    report_code = Column(String(100), index=True, nullable=True)
    report_type = Column(String(100), default="Unsafe Condition")
    condition = Column(String(100), default="Unsafe Condition")
    event = Column(String(255), default="Operational Hazard")
    actual_injury = Column(String(100), default="None")
    priority = Column(String(50), default="Medium")
    sif_potential = Column(String(50), default="Low") # 'Critical', 'High', 'Medium', 'Low'
    classification = Column(String(255), default="Low-Potential Observation / Non-SIF")
    reporter_name = Column(String(255), default="Frontline Employee")
    reported_by = Column(String(255), nullable=True)
    reporter_email = Column(String(255), default="worker@refinery.safe", index=True)
    hazard_category = Column(String(100), default="General Safety")
    shift_timing = Column(String(100), default="Shift A")
    location_detail = Column(String(255), nullable=True)
    is_sif_precursor = Column(String(50), default="No")
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)
    site = Column(String(100), default="Site Alpha - Jamnagar Complex")
    unit = Column(String(100), default="Unit 04 - FCCU")
    location = Column(String(255), default="Site Alpha - Jamnagar Complex - Unit 04 - FCCU")
    activity = Column(String(255), default="Routine Maintenance & Operation")
    description = Column(Text, nullable=False)
    raw_text = Column(Text, nullable=True)
    hazard = Column(String(255), default="Identified Hazard")
    equipment_involved = Column(String(255), nullable=True)
    people_involved = Column(Integer, default=1)
    energy_source = Column(String(255), default="Mechanical / Gravitational")
    barrier = Column(String(255), default="Engineered Safeguard / Standard PPE")
    barrier_failure = Column(String(255), default="Barrier compromised or absent")
    exposure = Column(String(255), default="Personnel within hazard strike zone")
    consequence = Column(String(255), default="Severe injury or facility impact")
    sif_probability = Column(Float, default=0.5)
    confidence = Column(Float, default=0.90)
    life_saving_rule = Column(String(255), default="Follow standard safety operating procedures")
    status = Column(String(50), default="Needs Review", index=True) # 'Needs Review', 'Assigned', 'In Progress', 'Recheck', 'Completed', 'Confirmed', 'Resolved'
    reviewer = Column(String(255), nullable=True)
    evidence = Column(Text, nullable=True)
    ai_rationale = Column(Text, nullable=True)
    ai_confidence = Column(Float, default=90.0)
    
    # SIF-SHIELD Composite Scoring
    risk_score = Column(Float, default=50.0)
    severity_score = Column(Float, default=5.0)
    exposure_score = Column(Float, default=5.0)
    barrier_score = Column(Float, default=5.0)
    consequence_score = Column(Float, default=5.0)
    sif_risk_score = Column(Float, default=5.0)
    risk_level = Column(String(50), default="MEDIUM") # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'

    # Corrective Actions & Controls
    stop_work_issued = Column(Boolean, default=False)
    assigned_team = Column(String(255), nullable=True)
    action_id = Column(String(100), nullable=True)
    action_status = Column(String(50), default="Pending")
    resolution_notes = Column(Text, nullable=True)
    audio_transcript = Column(Text, nullable=True)
    photo_url = Column(String(1000), nullable=True)
    audio_url = Column(String(1000), nullable=True)
    reporter_id = Column(Integer, nullable=True)
    
    # Workflow & Assignments
    assigned_officer_id = Column(Integer, nullable=True)
    assigned_officer_name = Column(String(255), nullable=True)
    assigned_to = Column(String(255), nullable=True)
    officer_status = Column(String(50), default="None")
    officer_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    recheck_notes = Column(Text, nullable=True)
    manager_id = Column(Integer, nullable=True)
    manager_name = Column(String(255), nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    unwatched_alert_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Alias for legacy references
IncidentReport = SafetyEvent

# 6. Officer Profiles Table
class OfficerProfile(Base):
    __tablename__ = "officer_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_name = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    officer_code = Column(String(100), default="OFF-001")
    id_number = Column(String(100), nullable=True)
    employee_id = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), default="+91 98765 43210")
    radio_channel = Column(String(50), default="CH-4")
    site = Column(String(100), default="Site Alpha - Jamnagar Complex")
    unit = Column(String(100), default="Unit 04 - FCCU")
    shift = Column(String(50), default="Shift A")
    status = Column(String(50), default="On Duty") # 'On Duty', 'In Field', 'Standby', 'Off Duty'
    role = Column(String(50), default="Safety Officer")
    certifications = Column(Text, default="[]")
    experience_years = Column(Integer, default=5)
    max_capacity = Column(Integer, default=8)
    open_reviews_count = Column(Integer, default=0)
    active_tasks_count = Column(Integer, default=0)
    completed_tasks_count = Column(Integer, default=0)
    total_tasks_count = Column(Integer, default=0)
    workload_score = Column(Float, default=0.0)
    compliance_rate = Column(Float, default=95.0)

# 7. Officer Tasks Table
class OfficerTask(Base):
    __tablename__ = "officer_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    task_type = Column(String(100), default="Field Investigation")
    site = Column(String(100), default="Site Alpha - Jamnagar Complex")
    unit = Column(String(100), default="Unit 04 - FCCU")
    priority = Column(String(50), default="HIGH") # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    assigned_officer_id = Column(Integer, nullable=True)
    assigned_officer_name = Column(String(255), default="Safety Officer")
    assigned_officer_email = Column(String(255), nullable=True)
    assigned_to = Column(String(255), nullable=True)
    assigned_by = Column(String(255), default="HSE Manager")
    instructions = Column(Text, nullable=True)
    status = Column(String(50), default="Assigned") # 'Assigned', 'In Progress', 'Submitted', 'Completed', 'Overdue'
    findings = Column(Text, nullable=True)
    submitted_findings = Column(Text, nullable=True)
    manager_notes = Column(Text, nullable=True)
    submitted_at = Column(String(100), nullable=True)
    due_date = Column(String(100), nullable=True)
    related_event_id = Column(String(100), nullable=True)
    created_at = Column(String(100), default=datetime.utcnow().isoformat)
    completed_at = Column(String(100), nullable=True)

# 8. Safety Directives Table
class SafetyDirective(Base):
    __tablename__ = "safety_directives"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    directive_id = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(50), default="URGENT") # 'URGENT', 'HIGH', 'STANDARD'
    target_scope = Column(String(50), default="ALL")
    target_name = Column(String(255), nullable=True)
    target_sites = Column(String(255), default="All Sites")
    issued_by = Column(String(255), default="HSE Directorate")
    acknowledge_count = Column(Integer, default=0)
    created_at = Column(String(100), default=datetime.utcnow().isoformat)

# 9. Life Saving Rules Table
class LifeSavingRule(Base):
    __tablename__ = "life_saving_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    icon = Column(String(100), nullable=True)
    common_barrier_failure = Column(String(255), nullable=True)
    precursor_density = Column(String(50), default="Medium")
    reports_count = Column(Integer, default=0)
    sif_count = Column(Integer, default=0)
    top_site = Column(String(255), default="Site Alpha - Jamnagar Complex")

# 10. Precursor Patterns Table
class PrecursorPattern(Base):
    __tablename__ = "precursor_patterns"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    occurrences = Column(Integer, default=1)
    sites = Column(Integer, default=1)
    activities = Column(String(255), nullable=True)
    life_saving_rule = Column(String(255), nullable=True)
    trend = Column(String(50), default="Stable")
    barrier_failure = Column(String(255), nullable=True)
    risk_level = Column(String(50), default="HIGH")

# 11. Interventions Table
class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Open") # 'Open', 'Closed'
    assigned_to = Column(String(255), default="Safety Team")
    due_date = Column(String(100), nullable=True)
    action_taken = Column(Text, nullable=True)
    created_at = Column(String(100), default=datetime.utcnow().isoformat)

# 12. Reviews Table
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(100), nullable=True)
    reviewer_name = Column(String(255), nullable=False)
    original_sif = Column(String(50), nullable=False)
    original_rule = Column(String(255), nullable=False)
    corrected_sif = Column(String(50), nullable=False)
    corrected_rule = Column(String(255), nullable=False)
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)

# 13. Learning Events Table
class LearningEvent(Base):
    __tablename__ = "learning_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(Integer, nullable=True)
    event_id = Column(String(100), nullable=True)
    original_prediction = Column(String(255), nullable=False)
    reviewer_decision = Column(String(255), nullable=False)
    learning_signal = Column(String(255), nullable=False)
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)

# 14. Audit Events Table
class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(100), nullable=True)
    action = Column(String(255), nullable=False)
    actor_name = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    user_role = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    user_email = Column(String(255), nullable=True)
    timestamp = Column(String(100), default=datetime.utcnow().isoformat)
    login_time = Column(String(100), nullable=True)

# Legacy alias for AuditLog
AuditLog = AuditEvent

# Notifications Table
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_role = Column(String(50), nullable=True) # 'Admin', 'Manager', 'Officer', 'Employee'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    report_id = Column(String(100), nullable=True)
    report_code = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
