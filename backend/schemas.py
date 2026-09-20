from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # 'Employee', 'Officer', 'Manager', 'Admin'
    id_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    id_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    approval_status: str
    is_active: bool
    created_at: Optional[datetime] = None
    token: Optional[str] = None

    class Config:
        from_attributes = True

class UserApprovalAction(BaseModel):
    user_id: Optional[int] = None
    action: str # 'approve' or 'reject'
    reason: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: str

# --- SIF Analysis & Incident Schemas ---
class AiSentenceClassification(BaseModel):
    condition: str
    event: str
    actual_injury: str
    sif_potential: str
    classification: str
    confidence: float
    rationale: str
    matched_words: Optional[List[str]] = []
    sentence_clauses: Optional[List[str]] = []

class IncidentCreateRequest(BaseModel):
    raw_text: str
    audio_transcript: Optional[str] = None
    audio_url: Optional[str] = None
    photo_url: Optional[str] = None
    hazard_category: Optional[str] = None
    shift_timing: Optional[str] = None
    location_detail: Optional[str] = None
    site: Optional[str] = "Site Alpha - Jamnagar Complex"
    unit: Optional[str] = "Unit 04 - FCCU"
    location: Optional[str] = None
    people_involved: Optional[int] = 1
    equipment_involved: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    report_type: Optional[str] = None
    timestamp: Optional[str] = None
    # Pre-evaluated AI fields (optional, if evaluated on client or backend)
    condition: Optional[str] = None
    event: Optional[str] = None
    actual_injury: Optional[str] = None
    sif_potential: Optional[str] = None
    energy_source: Optional[str] = None
    barrier: Optional[str] = None
    barrier_failure: Optional[str] = None
    exposure: Optional[str] = None
    consequence: Optional[str] = None
    life_saving_rule: Optional[str] = None
    risk_score: Optional[float] = None
    severity_score: Optional[float] = None
    exposure_score: Optional[float] = None
    barrier_score: Optional[float] = None
    ai_confidence: Optional[float] = None
    ai_rationale: Optional[str] = None

class IncidentAssignRequest(BaseModel):
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    is_self_assignment: Optional[bool] = False
    priority: Optional[str] = None
    notes: Optional[str] = None

class OfficerActionRequest(BaseModel):
    action: str # 'accept', 'reject', 'forward_recheck'
    officer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    actions_taken: Optional[str] = None

class ManagerCompleteRequest(BaseModel):
    status: str # 'Completed' or 'Needs Additional Action'
    recheck_notes: Optional[str] = None
    close_incident: Optional[bool] = True

class ManagerRejectRequest(BaseModel):
    rejection_reason: str

class SifAnalyzeRequest(BaseModel):
    text: str
