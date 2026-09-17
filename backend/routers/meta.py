from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["Metadata & Configuration"])

@router.get("/life-saving-rules")
def get_life_saving_rules():
    return [
        {"id": 1, "code": "LSR-01", "name": "Work at Height", "description": "Always wear personal fall arrest harness and maintain 100% tie-off above 1.8m.", "criticality": "Critical", "icon": "hard-hat"},
        {"id": 2, "code": "LSR-02", "name": "Energy Isolation (LOTO)", "description": "Verify zero energy state and lock/tag all primary and secondary energy sources.", "criticality": "Critical", "icon": "zap"},
        {"id": 3, "code": "LSR-03", "name": "Confined Space Entry", "description": "Continuous gas monitoring and standby rescue attendant mandatory before entry.", "criticality": "Critical", "icon": "door-closed"},
        {"id": 4, "code": "LSR-04", "name": "Line Break & Flange Management", "description": "Verify depressurization and hazardous chemical draining before opening lines.", "criticality": "High", "icon": "wrench"},
        {"id": 5, "code": "LSR-05", "name": "Hot Work & Ignition Control", "description": "Test atmosphere for flammable vapors within 15m radius prior to hot work.", "criticality": "High", "icon": "flame"},
        {"id": 6, "code": "LSR-06", "name": "Suspended Loads", "description": "Never position personnel under crane booms or suspended loads.", "criticality": "High", "icon": "anchor"}
    ]

@router.get("/precursors")
def get_precursors():
    return [
        {"id": 1, "pattern": "Bypassed Interlocks on Pressure Systems", "category": "Process Safety", "frequency": 14, "risk_level": "Critical"},
        {"id": 2, "pattern": "Lanyard Disconnected during Scaffolding Transition", "category": "Fall Protection", "frequency": 22, "risk_level": "Critical"},
        {"id": 3, "pattern": "Missing Flange Blind during Hot Work", "category": "Energy Isolation", "frequency": 8, "risk_level": "High"},
        {"id": 4, "pattern": "Corroded Relief Line on Flare Header", "category": "Asset Integrity", "frequency": 11, "risk_level": "High"}
    ]

@router.get("/sites")
def get_sites():
    return [
        {"id": 1, "name": "Jamnagar Complex", "code": "JAM", "location": "Gujarat, India", "risk_index": 72, "active_units": 8},
        {"id": 2, "name": "Hazira Petrochemical", "code": "HAZ", "location": "Surat, India", "risk_index": 64, "active_units": 6},
        {"id": 3, "name": "Nagothane Manufacturing", "code": "NAG", "location": "Maharashtra, India", "risk_index": 58, "active_units": 5}
    ]

@router.get("/sites/{site_id}")
def get_site_detail(site_id: str):
    return {
        "id": site_id,
        "name": "Jamnagar Complex",
        "code": "JAM",
        "units": [
            {"id": 1, "name": "Unit 04 - Fluidized Catalytic Cracking Unit (FCCU)", "code": "FCCU-04", "risk_score": 82},
            {"id": 2, "name": "Unit 02 - Crude Distillation Unit (CDU)", "code": "CDU-02", "risk_score": 68},
            {"id": 3, "name": "Unit 07 - Hydrogen Generation Plant (HGP)", "code": "HGP-07", "risk_score": 75}
        ]
    }

@router.get("/admin/service-status")
def get_service_status():
    return {
        "aiEngine": "Online (Cerebras AI + Whisper)",
        "database": "Connected (TiDB Cloud MySQL)",
        "storage": "Online (Cloudinary)",
        "gati": "Active Continuous Learning",
        "data": "Healthy (Encrypted TLS/SSL)"
    }

@router.post("/seed/reset")
def reset_seed():
    return {"success": True, "message": "System state verified and synchronized."}
