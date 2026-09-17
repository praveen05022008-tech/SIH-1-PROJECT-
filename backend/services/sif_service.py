import json
import re
import httpx
from config import settings

def extract_condition_type(text: str) -> str:
    tl = text.lower()
    if re.search(r'\b(unhooked|not\s+wearing|bypassed|failed\s+to|ignored|careless|rushing|no\s+ppe|without\s+harness|improper\s+use|using\s+phone|speeding|shortcut|horseplay)\b', tl):
        return "Unsafe Act"
    if re.search(r'\b(near\s+miss|almost\s+hit|narrowly\s+avoided|inches\s+away|nearly\s+dropped|close\s+call|narrowly\s+missed|missed\s+worker|fell\s+right\s+next)\b', tl):
        return "Near Miss"
    return "Unsafe Condition"

def extract_hazard_category(text: str) -> str:
    tl = text.lower()
    if re.search(r'\b(fall|height|scaffold|ladder|derrick|railing|platform|roof|open\s+edge)\b', tl):
        return "Working at Height / Fall Protection"
    if re.search(r'\b(drop|falling\s+object|pipe\s+fell|load\s+fell|suspended|crane|rigging|sling)\b', tl):
        return "Suspended Load & Dropped Objects"
    if re.search(r'\b(pressure|gas\s+leak|steam|valve|flange|blowout|rupture|depressur)\b', tl):
        return "Pressurized Systems & Flange Management"
    if re.search(r'\b(chemical|toxic|h2s|acid|fumes|asphyxiat|splash|corrosive)\b', tl):
        return "Hazardous Substances & Chemical Exposure"
    if re.search(r'\b(fire|spark|hot\s+work|welding|cutting|ignition|flame|combustible)\b', tl):
        return "Hot Work & Ignition Control"
    if re.search(r'\b(electric|shock|voltage|arc\s+flash|wire|short\s+circuit|live\s+wire)\b', tl):
        return "Electrical Safety & Energy Isolation (LOTO)"
    if re.search(r'\b(confined\s+space|vessel|tank\s+entry|manhole)\b', tl):
        return "Confined Space Entry"
    if re.search(r'\b(vehicle|forklift|truck|traffic|reversing|struck\s+by)\b', tl):
        return "Mobile Equipment & Vehicle Safety"
    if re.search(r'\b(machinery|pinch|rotating|crush|nip\s+point|pulley|entanglement)\b', tl):
        return "Machine Guarding & Mechanical Integrity"
    if re.search(r'\b(slip|trip|uneven|puddle|wet\s+floor|slippery)\b', tl):
        return "Slips, Trips & Walkway Safety"
    if re.search(r'\b(housekeeping|pallet|trash|debris|waste|clutter|obstruction)\b', tl):
        return "Housekeeping & Walkway Obstruction"
    if re.search(r'\b(damage|wear|corrosion|crack|loose|worn)\b', tl):
        return "Equipment Wear & Minor Damage"
    return "Operational Facility Hazard"

def compute_rule_based_sif(text: str) -> dict:
    tl = text.lower()
    condition = extract_condition_type(text)
    hazard_cat = extract_hazard_category(text)

    # Actual Injury Detection
    if re.search(r'\b(fatal|fatality|death|died|killed)\b', tl):
        actual_injury = "Fatal injury"
    elif re.search(r'\b(fracture|amputation|severe\s+burn|hospitalized|unconscious|head\s+injury|lost\s+time)\b', tl):
        actual_injury = "Severe / Lost Time Injury"
    elif re.search(r'\b(first\s+aid|minor\s+cut|bruise|scratch|bandaged|minor\s+injury)\b', tl):
        actual_injury = "First Aid / Minor Injury"
    else:
        actual_injury = "None"

    # Energy Source
    energy_source = "Mechanical / Environmental Hazard"
    if re.search(r'\b(fall|height|scaffold|railing|ladder)\b', tl):
        energy_source = "Gravitational Energy (> 1.8m Height)"
    elif re.search(r'\b(pressure|gas\s+leak|steam|valve|flange|blowout)\b', tl):
        energy_source = "Pressurized Hydrocarbon / High Pressure Gas (> 50 PSI)"
    elif re.search(r'\b(electric|voltage|arc\s+flash|wire)\b', tl):
        energy_source = "Electrical Energy (> 480V / Arc Flash Potential)"
    elif re.search(r'\b(fire|hot\s+work|spark|flame|welding)\b', tl):
        energy_source = "Thermal Energy & Flammable Atmosphere"
    elif re.search(r'\b(toxic|h2s|chemical|acid|corrosive)\b', tl):
        energy_source = "Chemical Toxicity / Corrosive Energy"
    elif re.search(r'\b(crane|drop|suspended|pipe\s+fell|load\s+fell)\b', tl):
        energy_source = "Suspended Mass / Dynamic Kinetic Energy"
    elif re.search(r'\b(slip|trip|pallet|trash|damage|casing)\b', tl):
        energy_source = "Low Gravitational / Low Mechanical Energy"

    # Barrier and Barrier Failure
    barrier = "Standard Operating Procedure & Facility Safeguards"
    barrier_failure = "Safeguard compromised or procedural lapse"
    if "fall" in tl or "height" in tl or "scaffold" in tl:
        barrier = "100% Tie-Off Full Body Harness & Certified Anchor Point"
        barrier_failure = "Lanyard unhooked / missing guardrail at elevation"
    elif "pressure" in tl or "valve" in tl or "leak" in tl or "gas" in tl:
        barrier = "Pressure Containment Integrity & Isolation Valves"
        barrier_failure = "Gasket/seal failure under pressure"
    elif "electric" in tl:
        barrier = "LOTO Lockout/Tagout & Dielectric Insulation"
        barrier_failure = "Live circuit uninsulated / incomplete isolation"
    elif "fire" in tl or "spark" in tl or "welding" in tl:
        barrier = "Hot Work Permit & Fire Retardant Habitat"
        barrier_failure = "Inadequate fire watch / combustible materials nearby"
    elif "drop" in tl or "crane" in tl:
        barrier = "Rigging Inspection & Barricaded Drop Zone Exclusion"
        barrier_failure = "Improper rigging / personnel within swing perimeter"
    elif "pallet" in tl or "housekeeping" in tl or "damage" in tl:
        barrier = "Routine Inspection & Walkway Clearance Standards"
        barrier_failure = "Equipment wear or delayed housekeeping"

    # SIF Potential Determination (Campbell Institute Category 3 logic)
    is_critical = bool(re.search(r'\b(fatal|death|blowout|explosion|h2s|electrocution|amputation|catastrophic|unconscious)\b', tl))
    is_high = bool(re.search(r'\b(without\s+harness|unhooked|scaffold|fell\s+inches|dropped.*crane|high\s+pressure|gas\s+leak|live\s+wire|confined\s+space|rupture|suspended\s+load)\b', tl))
    is_low = bool(re.search(r'\b(housekeeping|pallet|trash|scratch|paint|faded|minor\s+damage|damage\s+on\s+casing|wear|cosmetic|cleaning)\b', tl)) and not is_high and not is_critical

    if is_critical or actual_injury in ["Fatal injury", "Severe / Lost Time Injury"]:
        sif_potential = "Critical"
        severity_score = 9.5
        exposure_score = 9.0
        barrier_score = 8.5
        risk_score = 92.0
        priority = "Critical"
    elif is_high:
        sif_potential = "High"
        severity_score = 8.2
        exposure_score = 7.5
        barrier_score = 7.8
        risk_score = 78.5
        priority = "High"
    elif is_low:
        sif_potential = "Low"
        severity_score = 2.5
        exposure_score = 2.0
        barrier_score = 2.5
        risk_score = 22.0
        priority = "Low"
    else:
        sif_potential = "Medium"
        severity_score = 5.0
        exposure_score = 4.5
        barrier_score = 5.0
        risk_score = 48.0
        priority = "Medium"

    # Map Classification Standard
    if actual_injury in ["Fatal injury", "Severe / Lost Time Injury"]:
        classification = "SIF Incident / Serious Injury Occurred"
    elif sif_potential in ["Critical", "High"]:
        if condition == "Near Miss":
            classification = "SIF Precursor / High-Potential Near Miss"
        elif condition == "Unsafe Act":
            classification = "SIF Precursor / High-Risk Behavioral Deviation"
        else:
            classification = "SIF Precursor / High-Risk Facility Condition"
    elif sif_potential == "Medium":
        if condition == "Near Miss":
            classification = "Moderate Near Miss / Non-SIF"
        elif condition == "Unsafe Act":
            classification = "Moderate Procedural Deviation / Non-SIF"
        else:
            classification = "Moderate Facility Hazard / Non-SIF"
    else:
        classification = "Low-Potential Observation / Non-SIF"

    matched = [w for w in re.findall(r'\b[a-zA-Z]{4,}\b', text)][:6]

    rationale = (
        f"Evaluated '{text}'. Classified as {condition} ({hazard_cat}). "
        f"Energy level: {energy_source}. Barrier status: {barrier_failure}. "
        f"Resulting in {sif_potential} SIF Potential -> {classification}."
    )

    return {
        "condition": condition,
        "hazard_category": hazard_cat,
        "event": hazard_cat,
        "actual_injury": actual_injury,
        "sif_potential": sif_potential,
        "classification": classification,
        "priority": priority,
        "energy_source": energy_source,
        "barrier": barrier,
        "barrier_failure": barrier_failure,
        "exposure": f"Personnel in proximity to {hazard_cat.lower()}",
        "consequence": f"Risk assessment outcome for {hazard_cat.lower()}",
        "life_saving_rule": f"Enforce {barrier} before task execution",
        "risk_score": risk_score,
        "severity_score": severity_score,
        "exposure_score": exposure_score,
        "barrier_score": barrier_score,
        "ai_confidence": 92.0,
        "ai_rationale": rationale,
        "matched_words": matched
    }

def analyze_sif_report(text: str) -> dict:
    """
    Analyzes incident text using Groq AI (OpenAI-compatible) with fallback to local SIF Category 3 engine.
    """
    if not text or len(text.strip()) == 0:
        return compute_rule_based_sif("Routine safety observation")

    # 1. Attempt Groq AI API
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an elite Industrial Safety & SIF (Serious Injury or Fatality) AI engine following Campbell Institute & IOGP SIF Category 3 Precursor standards.\n"
        "Analyze the given safety observation text and output a valid JSON object with EXACT keys:\n"
        "- condition: Exactly one of ['Unsafe Act', 'Unsafe Condition', 'Near Miss']\n"
        "  * 'Unsafe Act': Human behavioral deviation / safety procedure non-compliance (e.g., working without harness, not wearing PPE, bypassing interlock, texting while driving).\n"
        "  * 'Unsafe Condition': Physical / environmental / mechanical defect (e.g., corroded pipe, oil puddle, broken ladder, damaged valve, missing guardrail, equipment wear).\n"
        "  * 'Near Miss': High energy event or dropped object that occurred and narrowly missed hitting personnel without injury.\n"
        "- event: Descriptive event mechanism (e.g., 'Fall from height', 'Dropped object / Suspended load', 'Pressurized fluid / gas release', 'Equipment wear & minor damage', 'Oil / chemical leakage & spill', 'Housekeeping & walkway obstruction', etc.)\n"
        "- actual_injury: Exactly one of ['Fatal injury', 'Severe / Lost Time Injury', 'First Aid / Minor Injury', 'None']\n"
        "- sif_potential: Exactly one of ['Critical', 'High', 'Medium', 'Low']\n"
        "  * 'Critical': Life-threatening catastrophe (explosion, H2S toxic gas, fatality, major blowout).\n"
        "  * 'High': High-energy source + compromised barrier + worker in strike zone (e.g. height > 1.8m without harness, heavy suspended load drop, high pressure hydrocarbon leak).\n"
        "  * 'Medium': Moderate non-life-threatening energy (e.g. low pressure drip, low height slip/trip hazard, minor machinery defect).\n"
        "  * 'Low': Low energy / routine maintenance / housekeeping / minor surface damage (e.g., scratched paint, pallet blocking secondary path, minor wear, damage on casing).\n"
        "- classification:\n"
        "  * If actual_injury is Fatal/Severe: 'SIF Incident / Serious Injury Occurred'\n"
        "  * If actual_injury is None:\n"
        "    - High/Critical SIF:\n"
        "      * If Near Miss -> 'SIF Precursor / High-Potential Near Miss'\n"
        "      * If Unsafe Act -> 'SIF Precursor / High-Risk Behavioral Deviation'\n"
        "      * If Unsafe Condition -> 'SIF Precursor / High-Risk Facility Condition'\n"
        "    - Medium SIF:\n"
        "      * If Near Miss -> 'Moderate Near Miss / Non-SIF'\n"
        "      * If Unsafe Act -> 'Moderate Procedural Deviation / Non-SIF'\n"
        "      * If Unsafe Condition -> 'Moderate Facility Hazard / Non-SIF'\n"
        "    - Low SIF -> 'Low-Potential Observation / Non-SIF'\n"
        "- hazard_category: string\n"
        "- energy_source: string\n"
        "- barrier: string\n"
        "- barrier_failure: string\n"
        "- exposure: string\n"
        "- consequence: string\n"
        "- life_saving_rule: string\n"
        "- risk_score: float (0.0 - 100.0)\n"
        "- severity_score: float (0.0 - 10.0)\n"
        "- exposure_score: float (0.0 - 10.0)\n"
        "- barrier_score: float (0.0 - 10.0)\n"
        "- ai_confidence: float (e.g. 94.5)\n"
        "- ai_rationale: string explaining step-by-step reasoning\n"
        "- matched_words: list of strings (extracted keywords from input text)"
    )

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Safety Observation: {text}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                if "risk_score" in parsed and "sif_potential" in parsed:
                    # Normalize confidence if on 0-1 scale
                    if parsed.get("ai_confidence", 0) <= 1.0:
                        parsed["ai_confidence"] = round(parsed.get("ai_confidence", 0.94) * 100, 1)
                    return parsed
    except Exception as e:
        print("[SifService] Groq AI call notice / local fallback:", e)

    # 2. Deep rule-based SIF Category 3 engine
    return compute_rule_based_sif(text)
