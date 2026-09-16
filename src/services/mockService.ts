/**
 * mockService.ts
 * Standalone client-side data layer for SIF-SHIELD.
 * Replaces all FastAPI / backend API calls with localStorage-backed data.
 * Fully self-contained – no server required.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const get = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const set = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    id: 1,
    email: 'admin@refinery.safe',
    password: 'password123',
    name: 'System Admin',
    role: 'Admin',
    id_number: 'ADM-001',
    phone: '+91 98000 00001',
    address: 'Central Operations Tower, Level 4',
    approval_status: 'Approved',
    is_active: true,
    created_at: daysAgo(120),
    token: 'token-admin-admin@refinery.safe',
  },
  {
    id: 2,
    email: 'manager@refinery.safe',
    password: 'password123',
    name: 'HSE Manager Lead',
    role: 'Safety Manager',
    id_number: 'MGR-001',
    phone: '+91 98000 00002',
    address: 'HSE Division Block B, Floor 2',
    approval_status: 'Approved',
    is_active: true,
    created_at: daysAgo(90),
    token: 'token-safety-manager-manager@refinery.safe',
  },
  {
    id: 3,
    email: 'officer@refinery.safe',
    password: 'password123',
    name: 'Safety Officer Lead',
    role: 'Safety Officer',
    id_number: 'OFF-001',
    phone: '+91 98000 00003',
    address: 'Field Inspection Hub, Sector 3',
    approval_status: 'Approved',
    is_active: true,
    created_at: daysAgo(60),
    token: 'token-safety-officer-officer@refinery.safe',
  },
  {
    id: 4,
    email: 'worker@refinery.safe',
    password: 'password123',
    name: 'Field Employee Alpha',
    role: 'Field Worker',
    id_number: 'EMP-001',
    phone: '+91 98000 00004',
    address: 'Rig Floor 01, Drilling Site A',
    approval_status: 'Approved',
    is_active: true,
    created_at: daysAgo(30),
    token: 'token-field-worker-worker@refinery.safe',
  },
  {
    id: 5,
    email: 'officer2@refinery.safe',
    password: 'password123',
    name: 'Safety Officer Beta',
    role: 'Safety Officer',
    id_number: 'OFF-002',
    phone: '+91 98000 00005',
    address: 'Refinery Unit 1, Safety Block',
    approval_status: 'Approved',
    is_active: true,
    created_at: daysAgo(45),
    token: 'token-safety-officer-officer2@refinery.safe',
  },
];

const SEED_SITES = [
  { id: 1, name: 'Drilling Site A', code: 'DS-A', location: 'Onshore Basin Sector 1', site_type: 'Drilling Rig' },
  { id: 2, name: 'Drilling Site B', code: 'DS-B', location: 'Onshore Basin Sector 2', site_type: 'Drilling Rig' },
  { id: 3, name: 'Drilling Site C', code: 'DS-C', location: 'Deepwell Pad 3', site_type: 'Drilling Rig' },
  { id: 4, name: 'Refinery Unit 1', code: 'REF-01', location: 'Coastal Complex Area A', site_type: 'Refinery' },
  { id: 5, name: 'Refinery Unit 2', code: 'REF-02', location: 'Coastal Complex Area B', site_type: 'Refinery' },
];

const SEED_LSR = [
  { id: 1, name: 'Energy Isolation', description: 'Verify isolation and zero energy before work begins.', total_reports: 14, sif_potential_reports: 5, precursor_density: 'High', common_barrier_failure: 'LOTO not applied', top_sites: 'Refinery Unit 1', top_activities: 'Maintenance, Valve Work' },
  { id: 2, name: 'Working at Height', description: 'Protect yourself against falling when working at height.', total_reports: 18, sif_potential_reports: 8, precursor_density: 'High', common_barrier_failure: 'Harness not worn', top_sites: 'Drilling Site A', top_activities: 'Scaffolding, Rig Floor Ops' },
  { id: 3, name: 'Confined Space', description: 'Obtain authorization before entering a confined space.', total_reports: 9, sif_potential_reports: 4, precursor_density: 'Medium', common_barrier_failure: 'No gas test done', top_sites: 'Refinery Unit 2', top_activities: 'Tank Cleaning, Inspection' },
  { id: 4, name: 'Line of Fire', description: 'Keep yourself and others out of the line of fire.', total_reports: 12, sif_potential_reports: 3, precursor_density: 'Medium', common_barrier_failure: 'No exclusion zone', top_sites: 'Drilling Site B', top_activities: 'Lifting, Drilling Ops' },
  { id: 5, name: 'Hot Work', description: 'Control flammables and ignition sources.', total_reports: 11, sif_potential_reports: 6, precursor_density: 'High', common_barrier_failure: 'No fire watch', top_sites: 'Refinery Unit 1', top_activities: 'Welding, Cutting' },
  { id: 6, name: 'Lifting Operations', description: 'Plan lifting operations and control the area.', total_reports: 7, sif_potential_reports: 2, precursor_density: 'Low', common_barrier_failure: 'Sling overload', top_sites: 'Drilling Site C', top_activities: 'Crane Ops, Heavy Lift' },
  { id: 7, name: 'Bypassing Safety Controls', description: 'Obtain authorization before overriding safety controls.', total_reports: 5, sif_potential_reports: 3, precursor_density: 'Medium', common_barrier_failure: 'Unauthorized bypass', top_sites: 'Refinery Unit 1', top_activities: 'Startup, Bypass Ops' },
  { id: 8, name: 'Driving', description: 'Follow safe driving rules and wear seatbelts.', total_reports: 6, sif_potential_reports: 1, precursor_density: 'Low', common_barrier_failure: 'Speeding on site', top_sites: 'All Sites', top_activities: 'Site Transport' },
  { id: 9, name: 'Safe Mechanical Handling', description: 'Use mechanical aids and inspect lifting gear.', total_reports: 4, sif_potential_reports: 1, precursor_density: 'Low', common_barrier_failure: 'No pre-use inspection', top_sites: 'Drilling Site A', top_activities: 'Equipment Handling' },
  { id: 10, name: 'Work Authorization', description: 'Work with a valid permit when required.', total_reports: 8, sif_potential_reports: 2, precursor_density: 'Medium', common_barrier_failure: 'Expired PTW used', top_sites: 'Refinery Unit 2', top_activities: 'Permit-to-Work Jobs' },
];

const SEED_EVENTS = [
  {
    id: 'EVT-001', report_id: 1, report_code: 'RPT-001', report_type: 'Near Miss',
    condition: 'Unsafe Condition', event: 'Worker nearly fell from scaffolding at Rig Floor 01 – harness not clipped.',
    actual_injury: 'None – near miss', sif_potential: 'Critical', classification: 'SIF Precursor',
    reporter_name: 'Field Employee Alpha', reported_by: 'Field Employee Alpha', reporter_email: 'worker@refinery.safe',
    hazard_category: 'Working at Height', shift_timing: 'Day Shift', location_detail: 'Rig Floor 01',
    is_sif_precursor: 'Yes',
    timestamp: hoursAgo(3), site: 'Drilling Site A', unit: 'Rig Floor 01', location: 'Rig Floor 01, Level 3',
    activity: 'Scaffolding Erection', description: 'Worker was on scaffolding at 8m elevation and stepped to an unsecured plank. Harness was not clipped to lifeline. Supervisor observed and intervened before a fall occurred.',
    hazard: 'Fall from Height', equipment_involved: 'Scaffold, Safety Harness', people_involved: 1,
    energy_source: 'Gravitational', barrier: 'Fall Protection', barrier_failure: 'Harness not connected to lifeline',
    exposure: 'High', consequence: 'Fatal (if fallen)',
    sif_probability: 0.88, confidence: 0.92,
    life_saving_rule: 'Working at Height',
    status: 'Needs Review', reviewer: null, evidence: 'Supervisor verbal report',
    severity_score: 9.2, exposure_score: 8.5, barrier_score: 9.0, consequence_score: 9.8, sif_risk_score: 9.1,
    risk_level: 'CRITICAL', stop_work_issued: true, assigned_team: null, action_id: null,
    action_status: 'Pending', resolution_notes: null,
    l1_milestone: 'Milestone 3 – Drilling', l2_unit: 'RF-01', l3_discipline: 'HSE',
    l4_phase: 'Active Drilling', l5_activity: 'Scaffolding', l6_task: 'Erection',
    photo_url: null, audio_transcript: null, explanation: 'Critical SIF event. Harness non-compliance at height is a leading fatality cause.', recommended_action: 'Issue stop-work, conduct toolbox talk, mandatory harness re-training.'
  },
  {
    id: 'EVT-002', report_id: 2, report_code: 'RPT-002', report_type: 'Unsafe Act',
    condition: 'Unsafe Act', event: 'Technician bypassed lockout/tagout procedure during pump maintenance.',
    actual_injury: 'Minor hand laceration', sif_potential: 'High', classification: 'SIF Precursor',
    reporter_name: 'Safety Officer Lead', reported_by: 'Safety Officer Lead', reporter_email: 'officer@refinery.safe',
    hazard_category: 'Energy Isolation', shift_timing: 'Night Shift', location_detail: 'Mud Pump Section',
    is_sif_precursor: 'Yes',
    timestamp: hoursAgo(18), site: 'Drilling Site A', unit: 'Mud Pump Section', location: 'Pump Room A',
    activity: 'Preventive Maintenance', description: 'Technician performed maintenance on a mud pump without following the LOTO procedure. Equipment was energized. Technician suffered a minor hand laceration when the pump cycled unexpectedly.',
    hazard: 'Unexpected Energy Release', equipment_involved: 'Mud Pump, LOTO Locks', people_involved: 1,
    energy_source: 'Hydraulic / Mechanical', barrier: 'Lockout/Tagout', barrier_failure: 'LOTO procedure skipped',
    exposure: 'High', consequence: 'Amputation (if repeat)',
    sif_probability: 0.82, confidence: 0.89,
    life_saving_rule: 'Energy Isolation',
    status: 'Confirmed', reviewer: 'Safety Officer Lead', evidence: 'CCTV footage, LOTO log',
    severity_score: 8.7, exposure_score: 8.0, barrier_score: 9.2, consequence_score: 9.5, sif_risk_score: 8.8,
    risk_level: 'HIGH', stop_work_issued: false, assigned_team: 'Maintenance Team Alpha',
    action_id: 'ACT-002', action_status: 'In Progress', resolution_notes: 'LOTO refresher training scheduled.',
    l1_milestone: 'Milestone 3 – Drilling', l2_unit: 'MP-01', l3_discipline: 'Maintenance',
    l4_phase: 'Active Ops', l5_activity: 'PM Jobs', l6_task: 'Pump Maintenance',
    photo_url: null, audio_transcript: null, explanation: 'High-energy isolation bypass. LOTO non-compliance is a critical SIF precursor.',
    recommended_action: 'Mandatory LOTO retraining, supervisory sign-off procedure required.'
  },
  {
    id: 'EVT-003', report_id: 3, report_code: 'RPT-003', report_type: 'Unsafe Condition',
    condition: 'Unsafe Condition', event: 'Hydrocarbon gas leak detected in FCCU area. No isolation performed.',
    actual_injury: 'None', sif_potential: 'Critical', classification: 'SIF Precursor',
    reporter_name: 'Field Employee Alpha', reported_by: 'Field Employee Alpha', reporter_email: 'worker@refinery.safe',
    hazard_category: 'Hot Work', shift_timing: 'Day Shift', location_detail: 'FCCU-01',
    is_sif_precursor: 'Yes',
    timestamp: daysAgo(1), site: 'Drilling Site B', unit: 'FCCU - Section 01', location: 'FCCU Pipe Rack',
    activity: 'Routine Inspection', description: 'During routine inspection, a hydrocarbon gas leak was detected near FCCU flange joints. No immediate isolation was performed. Gas cloud measured at 20% LEL. Area was near welding operations scheduled for later shift.',
    hazard: 'Fire / Explosion', equipment_involved: 'FCCU Flanges, Gas Detector', people_involved: 5,
    energy_source: 'Chemical (Flammable Gas)', barrier: 'Gas Detection & Isolation', barrier_failure: 'Isolation not initiated on detection',
    exposure: 'High', consequence: 'Multiple Fatalities',
    sif_probability: 0.94, confidence: 0.96,
    life_saving_rule: 'Hot Work',
    status: 'Action Dispatched', reviewer: 'Safety Officer Lead', evidence: 'Gas detector readings, Photo',
    severity_score: 9.8, exposure_score: 9.5, barrier_score: 9.7, consequence_score: 10.0, sif_risk_score: 9.7,
    risk_level: 'CRITICAL', stop_work_issued: true, assigned_team: 'Emergency Response Team',
    action_id: 'ACT-003', action_status: 'In Progress', resolution_notes: 'Isolation valve closed. Area cordoned. Welding work postponed.',
    l1_milestone: 'Milestone 5 – Production', l2_unit: 'FCCU-01', l3_discipline: 'Process Safety',
    l4_phase: 'Production Run', l5_activity: 'Inspection', l6_task: 'Flange Check',
    photo_url: null, audio_transcript: null, explanation: 'Catastrophic potential. Gas leak near hot work is the highest SIF risk combination.',
    recommended_action: 'Immediate area evacuation, isolation, emergency shutdown of FCCU.'
  },
  {
    id: 'EVT-004', report_id: 4, report_code: 'RPT-004', report_type: 'Near Miss',
    condition: 'Unsafe Condition', event: 'Crane sling found with visible damage before lifting operation.',
    actual_injury: 'None', sif_potential: 'High', classification: 'Precursor',
    reporter_name: 'Field Employee Alpha', reported_by: 'Field Employee Alpha', reporter_email: 'worker@refinery.safe',
    hazard_category: 'Lifting Operations', shift_timing: 'Day Shift', location_detail: 'Tank Farm - Section 02',
    is_sif_precursor: 'No',
    timestamp: daysAgo(2), site: 'Drilling Site B', unit: 'Tank Farm - Section 02', location: 'Crane Bay',
    activity: 'Heavy Lift Operation', description: 'Pre-lift inspection revealed that the primary lifting sling had visible wire breaks and core damage. Sling was removed from service. Lift operation postponed pending replacement equipment.',
    hazard: 'Dropped Load', equipment_involved: 'Overhead Crane, Wire Rope Sling', people_involved: 3,
    energy_source: 'Gravitational / Mechanical', barrier: 'Pre-Use Inspection', barrier_failure: 'Damaged equipment still in use pool',
    exposure: 'Medium', consequence: 'Crush Injury / Fatality',
    sif_probability: 0.71, confidence: 0.84,
    life_saving_rule: 'Lifting Operations',
    status: 'Confirmed', reviewer: 'Safety Officer Lead', evidence: 'Pre-lift inspection form, Photo of sling',
    severity_score: 7.5, exposure_score: 7.0, barrier_score: 6.5, consequence_score: 8.5, sif_risk_score: 7.3,
    risk_level: 'HIGH', stop_work_issued: false, assigned_team: 'Rigging & Lifting Team',
    action_id: 'ACT-004', action_status: 'Completed', resolution_notes: 'Damaged sling quarantined and replaced. Lifting gear registry updated.',
    l1_milestone: 'Milestone 4 – Construction', l2_unit: 'TF-02', l3_discipline: 'Mechanical',
    l4_phase: 'Heavy Lift Phase', l5_activity: 'Crane Ops', l6_task: 'Pre-lift Check',
    photo_url: null, audio_transcript: null, explanation: 'Effective pre-use inspection caught the defect before the lift. Good barrier performance.',
    recommended_action: 'Review lifting gear inspection frequency. Update gear color-coding schedule.'
  },
  {
    id: 'EVT-005', report_id: 5, report_code: 'RPT-005', report_type: 'Unsafe Act',
    condition: 'Unsafe Act', event: 'Worker entered confined tank without confined space permit.',
    actual_injury: 'None – detected early', sif_potential: 'Critical', classification: 'SIF Precursor',
    reporter_name: 'Safety Officer Lead', reported_by: 'Safety Officer Lead', reporter_email: 'officer@refinery.safe',
    hazard_category: 'Confined Space', shift_timing: 'Night Shift', location_detail: 'Utility Block Section 02',
    is_sif_precursor: 'Yes',
    timestamp: daysAgo(3), site: 'Drilling Site C', unit: 'Utility Block Section 02', location: 'Storage Tank T-07',
    activity: 'Tank Cleaning', description: 'A worker was discovered inside storage tank T-07 without a valid confined space permit or atmospheric testing. H2S concentration inside was found to be 12 ppm. Worker was removed safely and monitored.',
    hazard: 'Toxic Gas Exposure', equipment_involved: 'Tank T-07, H2S Monitor', people_involved: 2,
    energy_source: 'Chemical (Toxic Gas)', barrier: 'Confined Space Permit', barrier_failure: 'No permit obtained, no gas test',
    exposure: 'High', consequence: 'Asphyxiation / Fatality',
    sif_probability: 0.91, confidence: 0.93,
    life_saving_rule: 'Confined Space',
    status: 'Resolved', reviewer: 'Safety Officer Lead', evidence: 'Gas monitor reading, Permit register',
    severity_score: 9.5, exposure_score: 9.2, barrier_score: 9.8, consequence_score: 9.9, sif_risk_score: 9.6,
    risk_level: 'CRITICAL', stop_work_issued: true, assigned_team: 'HSE Response Unit',
    action_id: 'ACT-005', action_status: 'Verified', resolution_notes: 'Worker medically cleared. Confined space procedure re-issued. Mandatory retraining for the team completed.',
    l1_milestone: 'Milestone 3 – Drilling', l2_unit: 'UB-02', l3_discipline: 'HSE',
    l4_phase: 'Maintenance', l5_activity: 'Tank Cleaning', l6_task: 'Entry Preparation',
    photo_url: null, audio_transcript: null, explanation: 'Toxic atmosphere entry without permit or testing. Classic confined space fatality scenario.',
    recommended_action: 'Reinstate permit-to-enter system. Add automated entry detection at tank hatches.'
  },
  {
    id: 'EVT-006', report_id: 6, report_code: 'RPT-006', report_type: 'Near Miss',
    condition: 'Unsafe Condition', event: 'Pedestrian walked into active crane swing zone during lift.',
    actual_injury: 'None', sif_potential: 'High', classification: 'Precursor',
    reporter_name: 'Field Employee Alpha', reported_by: 'Field Employee Alpha', reporter_email: 'worker@refinery.safe',
    hazard_category: 'Line of Fire', shift_timing: 'Day Shift', location_detail: 'Coastal Complex Area A',
    is_sif_precursor: 'No',
    timestamp: daysAgo(4), site: 'Refinery Unit 1', unit: 'Refinery Unit 1', location: 'Main Crane Path – REF-01',
    activity: 'Pipe Bundle Lift', description: 'During a pipe bundle lift in REF-01, a worker crossed beneath the suspended load without authorization. The area exclusion zone was not enforced. Rigger saw and raised alarm. Worker exited zone safely.',
    hazard: 'Struck by / Dropped Object', equipment_involved: 'Mobile Crane, Pipe Bundle', people_involved: 2,
    energy_source: 'Gravitational', barrier: 'Exclusion Zone', barrier_failure: 'Zone not clearly demarcated or enforced',
    exposure: 'Medium', consequence: 'Crush Injury / Fatality',
    sif_probability: 0.76, confidence: 0.81,
    life_saving_rule: 'Line of Fire',
    status: 'Needs Review', reviewer: null, evidence: 'Rigger report, Lift plan review',
    severity_score: 8.0, exposure_score: 7.5, barrier_score: 7.8, consequence_score: 9.0, sif_risk_score: 8.1,
    risk_level: 'HIGH', stop_work_issued: false, assigned_team: null,
    action_id: null, action_status: 'Pending', resolution_notes: null,
    l1_milestone: 'Milestone 4 – Construction', l2_unit: 'REF-01', l3_discipline: 'Mechanical',
    l4_phase: 'Structural Phase', l5_activity: 'Pipe Laying', l6_task: 'Lift & Position',
    photo_url: null, audio_transcript: null, explanation: 'Line-of-fire violation under a suspended load. High consequence potential.',
    recommended_action: 'Formal exclusion zone barriers. Banksman mandatory for all crane ops.'
  },
  {
    id: 'EVT-007', report_id: 7, report_code: 'RPT-007', report_type: 'Unsafe Condition',
    condition: 'Unsafe Condition', event: 'Welding operation performed without valid hot work permit.',
    actual_injury: 'None', sif_potential: 'High', classification: 'SIF Precursor',
    reporter_name: 'Safety Officer Beta', reported_by: 'Safety Officer Beta', reporter_email: 'officer2@refinery.safe',
    hazard_category: 'Hot Work', shift_timing: 'Day Shift', location_detail: 'Coastal Complex Area B',
    is_sif_precursor: 'Yes',
    timestamp: daysAgo(5), site: 'Refinery Unit 2', unit: 'Refinery Unit 2', location: 'Pipe Rack B – REF-02',
    activity: 'Pipe Repair', description: 'Welding observed at Pipe Rack B in REF-02 without valid hot work permit. Gas tests not performed before ignition. Area contained residual hydrocarbon vapors from a previous venting operation. No fire watch in place.',
    hazard: 'Fire / Explosion', equipment_involved: 'Welding Set, Pipe Rack', people_involved: 2,
    energy_source: 'Chemical (Flammable Vapors)', barrier: 'Hot Work Permit', barrier_failure: 'No PTW, no gas test, no fire watch',
    exposure: 'High', consequence: 'Multiple Fatalities',
    sif_probability: 0.89, confidence: 0.90,
    life_saving_rule: 'Hot Work',
    status: 'Confirmed', reviewer: 'Safety Officer Beta', evidence: 'Permit register, Witness statement',
    severity_score: 9.3, exposure_score: 9.0, barrier_score: 9.5, consequence_score: 9.9, sif_risk_score: 9.4,
    risk_level: 'CRITICAL', stop_work_issued: true, assigned_team: 'Emergency Response Team',
    action_id: 'ACT-007', action_status: 'In Progress', resolution_notes: 'Welding stopped. Area ventilated. Investigation underway.',
    l1_milestone: 'Milestone 5 – Production', l2_unit: 'REF-02', l3_discipline: 'Mechanical',
    l4_phase: 'Maintenance', l5_activity: 'Pipe Repair', l6_task: 'Welding',
    photo_url: null, audio_transcript: null, explanation: 'Unauthorized hot work near flammables. Very high explosion risk.',
    recommended_action: 'Zero-tolerance enforcement of hot work permit system. Supervisor disciplinary action.'
  },
  {
    id: 'EVT-008', report_id: 8, report_code: 'RPT-008', report_type: 'Near Miss',
    condition: 'Unsafe Condition', event: 'Pressure relief valve found stuck open at Refinery Unit 1.',
    actual_injury: 'None', sif_potential: 'Medium', classification: 'Precursor',
    reporter_name: 'Safety Officer Lead', reported_by: 'Safety Officer Lead', reporter_email: 'officer@refinery.safe',
    hazard_category: 'Energy Isolation', shift_timing: 'Night Shift', location_detail: 'Coastal Complex Area A',
    is_sif_precursor: 'No',
    timestamp: daysAgo(6), site: 'Refinery Unit 1', unit: 'Refinery Unit 1', location: 'Pressure Control Station',
    activity: 'Pressure Monitoring', description: 'Night shift operator observed PRV at pressure control station stuck in open position. Downstream pressure drop triggered alarm. Process was manually isolated while maintenance team replaced PRV.',
    hazard: 'Pressure Loss / Uncontrolled Release', equipment_involved: 'PRV, Pressure Control Station', people_involved: 3,
    energy_source: 'Pressure (Process)', barrier: 'PRV Integrity', barrier_failure: 'PRV mechanical failure',
    exposure: 'Medium', consequence: 'Process Release / Fire',
    sif_probability: 0.61, confidence: 0.78,
    life_saving_rule: 'Energy Isolation',
    status: 'Resolved', reviewer: 'Safety Officer Lead', evidence: 'DCS alarm log, Maintenance work order',
    severity_score: 6.5, exposure_score: 6.0, barrier_score: 5.5, consequence_score: 7.5, sif_risk_score: 6.3,
    risk_level: 'MEDIUM', stop_work_issued: false, assigned_team: 'Instrumentation Team',
    action_id: 'ACT-008', action_status: 'Verified', resolution_notes: 'PRV replaced. System pressure verified stable. Root cause: PRV inspection overdue by 30 days.',
    l1_milestone: 'Milestone 5 – Production', l2_unit: 'REF-01', l3_discipline: 'Process',
    l4_phase: 'Production Run', l5_activity: 'Monitoring', l6_task: 'Pressure Checks',
    photo_url: null, audio_transcript: null, explanation: 'Mechanical barrier failure. Timely operator response prevented escalation.',
    recommended_action: 'Revise PRV inspection schedule. Add real-time PRV health monitoring to DCS.'
  },
  {
    id: 'EVT-009', report_id: 9, report_code: 'RPT-009', report_type: 'Near Miss',
    condition: 'Near Miss', event: 'Forklift and pedestrian near-collision in warehouse area.',
    actual_injury: 'None', sif_potential: 'Medium', classification: 'Precursor',
    reporter_name: 'Field Employee Alpha', reported_by: 'Field Employee Alpha', reporter_email: 'worker@refinery.safe',
    hazard_category: 'Driving', shift_timing: 'Day Shift', location_detail: 'Onshore Basin Sector 1',
    is_sif_precursor: 'No',
    timestamp: daysAgo(7), site: 'Drilling Site A', unit: 'Rig Floor 01', location: 'Site Warehouse',
    activity: 'Materials Handling', description: 'Forklift operator turned corner at warehouse entrance at excessive speed. A pedestrian was walking in the undesignated pathway and had to jump aside to avoid being struck. No injury. Near miss logged.',
    hazard: 'Vehicle / Pedestrian Collision', equipment_involved: 'Forklift, Warehouse Entrance', people_involved: 2,
    energy_source: 'Kinetic (Vehicle)', barrier: 'Traffic Management Plan', barrier_failure: 'Speed not controlled, no pedestrian separation',
    exposure: 'Medium', consequence: 'Struck-by / Fatality',
    sif_probability: 0.58, confidence: 0.74,
    life_saving_rule: 'Driving',
    status: 'Needs Review', reviewer: null, evidence: 'Witness statement',
    severity_score: 6.0, exposure_score: 5.5, barrier_score: 5.0, consequence_score: 7.0, sif_risk_score: 5.9,
    risk_level: 'MEDIUM', stop_work_issued: false, assigned_team: null,
    action_id: null, action_status: 'Pending', resolution_notes: null,
    l1_milestone: 'Milestone 2 – Logistics', l2_unit: 'RF-01', l3_discipline: 'Logistics',
    l4_phase: 'Logistics Phase', l5_activity: 'Warehouse Ops', l6_task: 'Materials Delivery',
    photo_url: null, audio_transcript: null, explanation: 'Vehicle / pedestrian interface without adequate segregation. Recurring risk factor.',
    recommended_action: 'Install physical pedestrian barriers. Speed limits reinforced with road humps.'
  },
  {
    id: 'EVT-010', report_id: 10, report_code: 'RPT-010', report_type: 'Unsafe Condition',
    condition: 'Unsafe Condition', event: 'Work permit expired mid-job on critical valve replacement.',
    actual_injury: 'None', sif_potential: 'Medium', classification: 'Precursor',
    reporter_name: 'Safety Officer Beta', reported_by: 'Safety Officer Beta', reporter_email: 'officer2@refinery.safe',
    hazard_category: 'Work Authorization', shift_timing: 'Day Shift', location_detail: 'Coastal Complex Area B',
    is_sif_precursor: 'No',
    timestamp: daysAgo(8), site: 'Refinery Unit 2', unit: 'Refinery Unit 2', location: 'Valve Station VS-22',
    activity: 'Valve Replacement', description: 'Work on critical isolation valve VS-22 continued past the permit expiry time without renewal. Work permit had expired at 12:00 hrs; work was still in progress at 13:45. Safety officer observed and stopped work. Permit was renewed before work continued.',
    hazard: 'Unauthorized Work', equipment_involved: 'Valve VS-22, Work Permit', people_involved: 4,
    energy_source: 'Process (Pressurized Line)', barrier: 'Permit-to-Work System', barrier_failure: 'Permit renewal not tracked',
    exposure: 'Medium', consequence: 'Uncontrolled Release / Injury',
    sif_probability: 0.55, confidence: 0.72,
    life_saving_rule: 'Work Authorization',
    status: 'Confirmed', reviewer: 'Safety Officer Beta', evidence: 'Permit log, Shift register',
    severity_score: 5.8, exposure_score: 5.5, barrier_score: 5.0, consequence_score: 6.5, sif_risk_score: 5.7,
    risk_level: 'MEDIUM', stop_work_issued: false, assigned_team: 'Maintenance Team Bravo',
    action_id: 'ACT-010', action_status: 'Completed', resolution_notes: 'Permit system reviewed. Shift permit controller role assigned.',
    l1_milestone: 'Milestone 5 – Production', l2_unit: 'REF-02', l3_discipline: 'Maintenance',
    l4_phase: 'Maintenance', l5_activity: 'Valve Work', l6_task: 'Valve Replacement',
    photo_url: null, audio_transcript: null, explanation: 'Permit expiry not tracked. Procedural gap in shift handover process.',
    recommended_action: 'Digital permit management with auto-expiry alerts. Shift controller mandatory role.'
  },
];

const SEED_DIRECTIVES = [
  {
    directive_id: 'DIR-001', issued_by: 'HSE Manager Lead', issued_at: daysAgo(1),
    title: 'CRITICAL: Mandatory LOTO Compliance Audit – All Sites',
    content: 'Following the LOTO bypass incident at Drilling Site A (EVT-002), all sites must conduct immediate LOTO compliance audits. Maintenance team leaders to certify LOTO completion before any high-energy maintenance task. Report compliance status to HSE command by 18:00 today.',
    priority: 'CRITICAL', target_roles: ['Safety Officer', 'Field Worker'], acknowledged_by: []
  },
  {
    directive_id: 'DIR-002', issued_by: 'HSE Manager Lead', issued_at: daysAgo(2),
    title: 'URGENT: Confined Space Entry Protocol Reset – All Sites',
    content: 'Confined space entry without authorization is a life-safety violation. Immediate re-briefing of all confined space entry rules is mandatory for all site personnel by end of shift. Safety Officers to verify atmospheric testing equipment is calibrated and available at all entry points.',
    priority: 'HIGH', target_roles: ['Safety Officer', 'Field Worker'], acknowledged_by: []
  },
  {
    directive_id: 'DIR-003', issued_by: 'HSE Manager Lead', issued_at: daysAgo(3),
    title: 'ADVISORY: Working at Height Harness Inspection Campaign',
    content: 'All fall protection equipment must be inspected before the start of each shift. Personnel found working at height without properly connected harness to lifeline will be suspended from site work and subject to disciplinary action.',
    priority: 'MEDIUM', target_roles: ['Field Worker'], acknowledged_by: []
  },
];

const SEED_OFFICER_TASKS = [
  {
    task_id: 'TSK-001', event_id: 'EVT-001', event_code: 'RPT-001',
    assigned_to_email: 'officer@refinery.safe', assigned_to_name: 'Safety Officer Lead',
    assigned_by: 'HSE Manager Lead', assigned_at: hoursAgo(4),
    due_date: new Date(Date.now() + 172_800_000).toISOString(),
    task_type: 'Field Investigation', priority: 'CRITICAL',
    description: 'Investigate scaffolding harness non-compliance at Rig Floor 01. Document findings, interview involved parties, and submit corrective action recommendations.',
    status: 'In Progress', findings: null, corrective_actions: null, completed_at: null,
    is_recheck: false, recheck_notes: null
  },
  {
    task_id: 'TSK-002', event_id: 'EVT-003', event_code: 'RPT-003',
    assigned_to_email: 'officer@refinery.safe', assigned_to_name: 'Safety Officer Lead',
    assigned_by: 'HSE Manager Lead', assigned_at: daysAgo(1),
    due_date: new Date(Date.now() + 86_400_000).toISOString(),
    task_type: 'Follow-up Verification', priority: 'HIGH',
    description: 'Verify that FCCU area gas leak has been fully isolated and that hot work standdown is being enforced. Confirm atmospheric readings are below 5% LEL before approving restart.',
    status: 'Pending', findings: null, corrective_actions: null, completed_at: null,
    is_recheck: false, recheck_notes: null
  },
  {
    task_id: 'TSK-003', event_id: 'EVT-005', event_code: 'RPT-005',
    assigned_to_email: 'officer2@refinery.safe', assigned_to_name: 'Safety Officer Beta',
    assigned_by: 'HSE Manager Lead', assigned_at: daysAgo(3),
    due_date: new Date(Date.now() - 86_400_000).toISOString(),
    task_type: 'Corrective Action Verification', priority: 'MEDIUM',
    description: 'Verify completion of confined space retraining for all personnel at Utility Block Section 02 and confirm updated permits are in place at tank hatches.',
    status: 'Submitted', findings: 'All personnel completed retraining. Permits updated at T-07 and T-09 entry points.', corrective_actions: 'Entry detection sensors ordered for T-07 and T-09. Expected delivery in 2 weeks.', completed_at: hoursAgo(12),
    is_recheck: false, recheck_notes: null
  },
];

const SEED_AUDIT_EVENTS = [
  { id: 1, action: 'USER_LOGIN', user_email: 'admin@refinery.safe', user_name: 'System Admin', description: 'Administrator logged into the system.', timestamp: hoursAgo(2) },
  { id: 2, action: 'EVENT_REVIEWED', user_email: 'officer@refinery.safe', user_name: 'Safety Officer Lead', description: 'Safety event EVT-002 reviewed and confirmed.', timestamp: hoursAgo(20) },
  { id: 3, action: 'DIRECTIVE_ISSUED', user_email: 'manager@refinery.safe', user_name: 'HSE Manager Lead', description: 'Safety directive DIR-001 issued to all sites.', timestamp: daysAgo(1) },
  { id: 4, action: 'TASK_ASSIGNED', user_email: 'manager@refinery.safe', user_name: 'HSE Manager Lead', description: 'Investigation task TSK-001 assigned to Safety Officer Lead for EVT-001.', timestamp: hoursAgo(4) },
  { id: 5, action: 'TASK_SUBMITTED', user_email: 'officer2@refinery.safe', user_name: 'Safety Officer Beta', description: 'Task TSK-003 findings submitted for confined space event EVT-005.', timestamp: hoursAgo(12) },
];

const SEED_PRECURSORS = [
  { id: 1, pattern_name: 'LOTO Non-Compliance Cluster', life_saving_rule: 'Energy Isolation', occurrence_count: 5, sites: 'Drilling Site A, Refinery Unit 1', last_seen: hoursAgo(18), risk_level: 'HIGH', description: 'Recurring pattern of LOTO procedures being skipped or partially applied during maintenance windows.' },
  { id: 2, pattern_name: 'Working-at-Height Harness Gap', life_saving_rule: 'Working at Height', occurrence_count: 7, sites: 'Drilling Site A, Drilling Site C', last_seen: hoursAgo(3), risk_level: 'CRITICAL', description: 'Multiple incidents of personnel failing to clip harnesses to lifelines while above 2m. Night shifts show higher frequency.' },
  { id: 3, pattern_name: 'Hot Work Permit Lapses', life_saving_rule: 'Hot Work', occurrence_count: 4, sites: 'Refinery Unit 1, Refinery Unit 2', last_seen: daysAgo(5), risk_level: 'HIGH', description: 'Hot work initiated either without a valid permit or with an expired permit on 4 separate occasions in the last 30 days.' },
];

const SEED_LEARNING_EVENTS = [
  { id: 1, event_id: 'EVT-005', lesson_title: 'Confined Space Entry Without Permit – Near Fatality', lesson_summary: 'Worker entered tank with 12 ppm H2S without atmospheric testing or permit. Intervention was timely. Key learning: mandatory gas testing before any confined space entry, regardless of perceived duration.', category: 'Confined Space', risk_level: 'CRITICAL', created_at: daysAgo(3), shared_by: 'Safety Officer Lead' },
  { id: 2, event_id: 'EVT-002', lesson_title: 'LOTO Bypass Leads to Minor Injury – High Consequence Potential', lesson_summary: 'Skipping LOTO on an energized pump resulted in minor laceration. The same bypass on a larger pump could have resulted in amputation. LOTO compliance is non-negotiable for all energy isolation tasks.', category: 'Energy Isolation', risk_level: 'HIGH', created_at: daysAgo(18), shared_by: 'Safety Officer Lead' },
  { id: 3, event_id: 'EVT-003', lesson_title: 'Hydrocarbon Leak Near Hot Work – Near-Catastrophic Event', lesson_summary: 'Gas leak at 20% LEL was not isolated immediately. Hot work was scheduled nearby. Combined effect could have been catastrophic. Simultaneous hot work and gas releases must trigger automatic halt to all ignition sources.', category: 'Process Safety', risk_level: 'CRITICAL', created_at: daysAgo(1), shared_by: 'HSE Manager Lead' },
];

// ─── Store Initializer ────────────────────────────────────────────────────────

const INITIALIZED_KEY = 'mock_db_initialized_v3';

export function initializeMockStore(): void {
  if (localStorage.getItem(INITIALIZED_KEY)) return;

  set('mock_users', SEED_USERS);
  set('mock_sites', SEED_SITES);
  set('mock_lsr', SEED_LSR);
  set('mock_events', SEED_EVENTS);
  set('mock_directives', SEED_DIRECTIVES);
  set('mock_tasks', SEED_OFFICER_TASKS);
  set('mock_audit', SEED_AUDIT_EVENTS);
  set('mock_precursors', SEED_PRECURSORS);
  set('mock_learning', SEED_LEARNING_EVENTS);

  localStorage.setItem(INITIALIZED_KEY, '1');
}

// ─── API Response Handler ─────────────────────────────────────────────────────

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Mock Fetch Handler ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMockRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = options.body ? JSON.parse(options.body as string) : {};

  // Strip base URL, keep only path + query
  const pathWithQuery = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
  const [path, queryStr] = pathWithQuery.split('?');
  const query: Record<string, string> = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  const addAudit = (action: string, description: string) => {
    const audits = get<typeof SEED_AUDIT_EVENTS>('mock_audit', []);
    audits.unshift({ id: Date.now(), action, user_email: body.email || 'system', user_name: body.name || 'System', description, timestamp: now() });
    set('mock_audit', audits);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  if (path === '/auth/login' && method === 'POST') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    const found = users.find(u => u.email === body.email && u.password === body.password);
    if (!found) return err(401, 'Invalid email or password.');
    if (found.approval_status === 'Pending') return err(403, 'Your account is pending approval by the System Administrator.');
    if (found.approval_status === 'Rejected') return err(403, 'Your account registration has been rejected by the administrator.');
    if (!found.is_active) return err(403, 'Your account has been deactivated. Contact the system administrator.');
    addAudit('USER_LOGIN', `${found.name} (${found.role}) signed in.`);
    return ok({ ...found });
  }

  if (path === '/auth/me' && (method === 'GET' || method === 'POST')) {
    const emailHeader = (options.headers as Record<string, string>)?.['X-User-Email'];
    const users = get<typeof SEED_USERS>('mock_users', []);
    const found = users.find(u => u.email === emailHeader);
    if (!found) return err(401, 'Session expired. Please sign in again.');
    return ok({ ...found });
  }

  if (path === '/auth/verify' && method === 'POST') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    const found = users.find(u => u.email === body.email);
    if (!found) return err(401, 'Invalid token.');
    return ok({ ...found });
  }

  if (path === '/auth/register' && method === 'POST') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    if (users.find(u => u.email === body.email)) {
      return err(400, 'An account with this email already exists.');
    }
    const master = users.find(u => u.role === 'Admin' && u.email === 'admin@refinery.safe');
    if (master && body.email === 'admin@refinery.safe') {
      return err(400, "The master administrator account 'admin@refinery.safe' cannot be re-registered.");
    }
    const newUser = {
      id: Date.now(),
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role || 'Employee',
      id_number: body.id_number || '',
      phone: body.phone || '',
      address: body.address || '',
      approval_status: 'Pending',
      is_active: false,
      created_at: now(),
      token: `token-${(body.role || 'employee').toLowerCase().replace(/\s+/g, '-')}-${body.email}`,
    };
    users.push(newUser);
    set('mock_users', users);
    addAudit('USER_REGISTERED', `New user ${body.name} (${body.role}) registered. Awaiting Admin approval.`);
    return ok({ ...newUser, message: 'Registration submitted. Awaiting admin approval.' });
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────

  if (path === '/admin/dashboard' && method === 'GET') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    const events = get<typeof SEED_EVENTS>('mock_events', []);
    const pending = users.filter(u => u.approval_status === 'Pending').length;
    const approved = users.filter(u => u.approval_status === 'Approved').length;
    const rejected = users.filter(u => u.approval_status === 'Rejected').length;
    const active = users.filter(u => u.is_active).length;
    const deactivated = users.filter(u => !u.is_active && u.approval_status === 'Approved').length;
    const employees = users.filter(u => u.role === 'Employee' || u.role === 'Field Worker').length;
    const officers = users.filter(u => u.role === 'Safety Officer' || u.role === 'Officer').length;
    const managers = users.filter(u => u.role === 'Safety Manager' || u.role === 'Manager').length;
    const admins = users.filter(u => u.role === 'Admin').length;

    const roleCounts = [
      { role: 'Employee', count: employees, color: '#6366f1' },
      { role: 'Officer', count: officers, color: '#0ea5e9' },
      { role: 'Manager', count: managers, color: '#f59e0b' },
      { role: 'Admin', count: admins, color: '#ef4444' },
    ];

    const statusCounts = [
      { status: 'Needs Review', count: events.filter(e => e.status === 'Needs Review').length, color: '#f59e0b' },
      { status: 'Confirmed', count: events.filter(e => e.status === 'Confirmed').length, color: '#3b82f6' },
      { status: 'Action Dispatched', count: events.filter(e => e.status === 'Action Dispatched').length, color: '#8b5cf6' },
      { status: 'Resolved', count: events.filter(e => e.status === 'Resolved').length, color: '#10b981' },
    ];

    const issueTypes = [
      { type: 'Near Miss', count: events.filter(e => e.report_type === 'Near Miss').length },
      { type: 'Unsafe Act', count: events.filter(e => e.report_type === 'Unsafe Act').length },
      { type: 'Unsafe Condition', count: events.filter(e => e.report_type === 'Unsafe Condition').length },
    ];

    const severityCounts = [
      { severity: 'CRITICAL', count: events.filter(e => e.risk_level === 'CRITICAL').length, color: '#ef4444' },
      { severity: 'HIGH', count: events.filter(e => e.risk_level === 'HIGH').length, color: '#f97316' },
      { severity: 'MEDIUM', count: events.filter(e => e.risk_level === 'MEDIUM').length, color: '#f59e0b' },
      { severity: 'LOW', count: events.filter(e => e.risk_level === 'LOW').length, color: '#10b981' },
    ];

    return ok({
      kpis: {
        total_employee: employees, total_officer: officers,
        total_manager: managers, total_admin: admins,
        total_users: users.length, pending_approvals: pending,
        approved_users: approved, rejected_users: rejected,
        active_users: active, deactivated_users: deactivated,
        total_reports: events.length,
      },
      charts: {
        role_distribution: roleCounts,
        status_distribution: statusCounts,
        issue_distribution: issueTypes,
        severity_distribution: severityCounts,
      }
    });
  }

  // ── Users / Admin Users ───────────────────────────────────────────────────

  if ((path === '/admin/users' || path === '/users') && method === 'GET') {
    return ok(get('mock_users', []));
  }

  if (path === '/users' && method === 'POST') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    const newUser = {
      id: Date.now(), email: body.email, password: body.password || 'password123',
      name: body.name, role: body.role || 'Employee', id_number: '', phone: '', address: '',
      approval_status: 'Approved', is_active: true, created_at: now(),
      token: `token-${(body.role || 'employee').toLowerCase().replace(/\s+/g, '-')}-${body.email}`,
    };
    users.push(newUser);
    set('mock_users', users);
    return ok(newUser);
  }

  // Admin user actions
  const userActionMatch = path.match(/^\/admin\/users\/(\d+)\/(approve|reject|toggle-active|change-role)$/);
  if (userActionMatch) {
    const userId = parseInt(userActionMatch[1]);
    const action = userActionMatch[2];
    const users = get<typeof SEED_USERS>('mock_users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return err(404, 'User not found.');
    if (action === 'approve') {
      users[idx].approval_status = 'Approved'; users[idx].is_active = true;
      addAudit('USER_APPROVED', `User ${users[idx].name} approved by admin.`);
    } else if (action === 'reject') {
      users[idx].approval_status = 'Rejected'; users[idx].is_active = false;
      addAudit('USER_REJECTED', `User ${users[idx].name} rejected by admin.`);
    } else if (action === 'toggle-active') {
      users[idx].is_active = !users[idx].is_active;
      addAudit('USER_TOGGLED', `User ${users[idx].name} ${users[idx].is_active ? 'activated' : 'deactivated'}.`);
    } else if (action === 'change-role') {
      users[idx].role = body.role;
      addAudit('USER_ROLE_CHANGED', `User ${users[idx].name} role changed to ${body.role}.`);
    }
    set('mock_users', users);
    return ok(users[idx]);
  }

  const userDeleteMatch = path.match(/^\/(?:admin\/)?users\/(\d+)$/);
  if (userDeleteMatch && method === 'DELETE') {
    const userId = parseInt(userDeleteMatch[1]);
    let users = get<typeof SEED_USERS>('mock_users', []);
    const found = users.find(u => u.id === userId);
    if (!found) return err(404, 'User not found.');
    users = users.filter(u => u.id !== userId);
    set('mock_users', users);
    addAudit('USER_DELETED', `User ${found.name} deleted by admin.`);
    return ok({ message: 'User deleted.' });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  if (path === '/events' && method === 'GET') {
    let events = get<typeof SEED_EVENTS>('mock_events', []);
    if (query.status) events = events.filter(e => e.status === query.status);
    if (query.reporter_email) events = events.filter(e => e.reporter_email === query.reporter_email);
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return ok(events);
  }

  if (path === '/events' && method === 'POST') {
    const events = get<typeof SEED_EVENTS>('mock_events', []);
    const newId = `EVT-${String(events.length + 1).padStart(3, '0')}-${uid().slice(0, 4)}`;
    const newCode = `RPT-${String(events.length + 1).padStart(3, '0')}`;
    // Simple AI scoring simulation
    const desc = (body.description || body.raw_text || '').toLowerCase();
    const sifWords = ['fall', 'flame', 'explosion', 'confined', 'loto', 'lockout', 'toxic', 'gas', 'electr', 'crush', 'height'];
    const matchCount = sifWords.filter(w => desc.includes(w)).length;
    const sifProb = Math.min(0.95, 0.35 + matchCount * 0.1);
    const riskScore = parseFloat((sifProb * 10).toFixed(1));
    const riskLevel = riskScore >= 8.5 ? 'CRITICAL' : riskScore >= 7 ? 'HIGH' : riskScore >= 5 ? 'MEDIUM' : 'LOW';
    const sifPotential = riskScore >= 8.5 ? 'Critical' : riskScore >= 7 ? 'High' : riskScore >= 5 ? 'Medium' : 'Low';

    const newEvent = {
      id: newId, report_id: events.length + 1, report_code: newCode, report_type: body.report_type || 'Near Miss',
      condition: body.report_type || 'Near Miss', event: body.description || body.raw_text || 'Field safety observation recorded.',
      actual_injury: body.actual_injury || 'None reported', sif_potential: sifPotential, classification: sifProb >= 0.7 ? 'SIF Precursor' : 'Precursor',
      reporter_name: body.reporter_name || 'Anonymous', reported_by: body.reporter_name || 'Anonymous', reporter_email: body.reporter_email || '',
      hazard_category: body.hazard_category || body.life_saving_rule || 'General Safety', shift_timing: body.shift_timing || 'Day Shift',
      location_detail: body.location_detail || body.location || 'Field Location', is_sif_precursor: sifProb >= 0.7 ? 'Yes' : 'No',
      timestamp: now(), site: body.site || 'Drilling Site A', unit: body.unit || 'Rig Floor 01', location: body.location || 'Field Site',
      activity: body.activity || 'Site Operations', description: body.description || body.raw_text || '',
      hazard: body.hazard_category || 'General Hazard', equipment_involved: body.equipment_involved || null, people_involved: body.people_involved || 1,
      energy_source: 'To be assessed', barrier: 'To be assessed', barrier_failure: 'Under investigation',
      exposure: sifProb >= 0.7 ? 'High' : 'Medium', consequence: sifProb >= 0.7 ? 'Serious Injury / Fatality' : 'Minor Injury',
      sif_probability: sifProb, confidence: parseFloat((sifProb * 0.95).toFixed(2)),
      life_saving_rule: body.life_saving_rule || 'Work Authorization',
      status: 'Needs Review' as const, reviewer: null, evidence: body.audio_transcript ? 'Voice transcript provided' : 'Written report',
      severity_score: riskScore, exposure_score: riskScore * 0.9, barrier_score: riskScore * 0.95, consequence_score: riskScore * 1.05 > 10 ? 10 : riskScore * 1.05,
      sif_risk_score: riskScore, risk_level: riskLevel as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
      stop_work_issued: sifProb >= 0.9, assigned_team: null, action_id: null, action_status: 'Pending', resolution_notes: null,
      audio_transcript: body.audio_transcript || null, photo_url: body.photo_url || null,
      explanation: `AI Assessment: SIF probability ${(sifProb * 100).toFixed(0)}%. ${sifPotential} consequence potential detected.`,
      recommended_action: sifProb >= 0.8 ? 'Immediate investigation and corrective action required.' : 'Schedule investigation and implement controls.',
      l1_milestone: 'Milestone 3 – Operations', l2_unit: 'Field', l3_discipline: 'HSE',
      l4_phase: 'Active Ops', l5_activity: body.activity || 'Routine', l6_task: 'Safety Report',
    };
    events.unshift(newEvent as typeof SEED_EVENTS[0]);
    set('mock_events', events);
    addAudit('EVENT_SUBMITTED', `New safety report ${newCode} submitted by ${body.reporter_name || 'Worker'}.`);
    return ok(newEvent);
  }

  // Event by ID
  const eventByIdMatch = path.match(/^\/events\/([A-Za-z0-9%-]+?)\/?(review|action|ai-analyze)?$/);
  if (eventByIdMatch) {
    const eventId = decodeURIComponent(eventByIdMatch[1]);
    const action = eventByIdMatch[2];
    const events = get<typeof SEED_EVENTS>('mock_events', []);
    const idx = events.findIndex(e => e.id === eventId || e.report_code === eventId);

    if (method === 'GET' && !action) {
      if (idx === -1) return err(404, 'Event not found.');
      return ok(events[idx]);
    }

    if (action === 'review' && method === 'PUT') {
      if (idx === -1) return err(404, 'Event not found.');
      events[idx] = { ...events[idx], ...body, status: body.status || events[idx].status, reviewer: body.reviewer || events[idx].reviewer };
      set('mock_events', events);
      addAudit('EVENT_REVIEWED', `Event ${eventId} reviewed. Status: ${events[idx].status}`);
      return ok(events[idx]);
    }

    if (action === 'action' && method === 'POST') {
      if (idx === -1) return err(404, 'Event not found.');
      const actionId = `ACT-${uid().slice(0, 6)}`;
      events[idx] = { ...events[idx], action_id: actionId, action_status: body.action_status || 'In Progress', assigned_team: body.assigned_team || events[idx].assigned_team, status: 'Action Dispatched' as const, resolution_notes: body.resolution_notes || events[idx].resolution_notes } as typeof SEED_EVENTS[0];
      set('mock_events', events);
      addAudit('EVENT_ACTION', `Action ${actionId} dispatched for event ${eventId}.`);
      return ok(events[idx]);
    }

    if (action === 'ai-analyze' && method === 'POST') {
      if (idx === -1) return err(404, 'Event not found.');
      const evt = events[idx];
      return ok({
        event_id: eventId, analysis_complete: true,
        sif_probability: evt.sif_probability, confidence: evt.confidence,
        risk_level: evt.risk_level, sif_risk_score: evt.sif_risk_score,
        explanation: evt.explanation || 'AI analysis complete. See SIF risk scores for details.',
        recommended_action: evt.recommended_action || 'Review event details and assign corrective actions.',
        barrier_analysis: `Barrier failure: ${evt.barrier_failure}. Energy source: ${evt.energy_source}.`,
        precursor_matches: evt.is_sif_precursor === 'Yes' ? ['Matches historical precursor pattern for ' + evt.life_saving_rule] : [],
      });
    }
  }

  // ── Admin Reports ─────────────────────────────────────────────────────────

  if (path === '/admin/reports' && method === 'GET') {
    return ok(get('mock_events', []));
  }

  const adminReportDeleteMatch = path.match(/^\/admin\/reports\/(.+)$/);
  if (adminReportDeleteMatch && method === 'DELETE') {
    const reportId = decodeURIComponent(adminReportDeleteMatch[1]);
    let events = get<typeof SEED_EVENTS>('mock_events', []);
    events = events.filter(e => e.id !== reportId && e.report_code !== reportId);
    set('mock_events', events);
    addAudit('EVENT_DELETED', `Event/report ${reportId} deleted by admin.`);
    return ok({ message: 'Report deleted.' });
  }

  if (path === '/admin/reports/batch-delete' && method === 'DELETE') {
    const ids: string[] = body.ids || [];
    let events = get<typeof SEED_EVENTS>('mock_events', []);
    events = events.filter(e => !ids.includes(e.id) && !ids.includes(e.report_code));
    set('mock_events', events);
    addAudit('EVENT_BATCH_DELETE', `Batch delete of ${ids.length} reports by admin.`);
    return ok({ message: `${ids.length} reports deleted.` });
  }

  // ── Admin Audit Logs ──────────────────────────────────────────────────────

  if ((path === '/admin/audit-logs' || path === '/audit') && method === 'GET') {
    const audits = get('mock_audit', []);
    const limit = parseInt(query.limit || '100');
    return ok((audits as typeof SEED_AUDIT_EVENTS).slice(0, limit));
  }

  // ── Admin Service Status ──────────────────────────────────────────────────

  if (path === '/admin/service-status' && method === 'GET') {
    return ok({
      database: { status: 'healthy', message: 'Client storage operational', latency_ms: 1 },
      ai_service: { status: 'healthy', message: 'GATI AI Engine Active (Client Mode)', latency_ms: 12 },
      auth_service: { status: 'healthy', message: 'Session management operational', latency_ms: 1 },
      voice_service: { status: 'offline', message: 'Whisper transcription requires server mode' },
    });
  }

  // ── Manager Directives ────────────────────────────────────────────────────

  if (path === '/manager/directives' && method === 'GET') {
    return ok(get('mock_directives', []));
  }

  if (path === '/manager/directives' && method === 'POST') {
    const directives = get<typeof SEED_DIRECTIVES>('mock_directives', []);
    const newDir = {
      directive_id: `DIR-${uid().slice(0, 6)}`,
      issued_by: body.issued_by || 'HSE Manager Lead',
      issued_at: now(), title: body.title, content: body.content,
      priority: body.priority || 'MEDIUM', target_roles: body.target_roles || ['Field Worker'], acknowledged_by: [],
    };
    directives.unshift(newDir);
    set('mock_directives', directives);
    addAudit('DIRECTIVE_ISSUED', `New directive "${body.title}" issued.`);
    return ok(newDir);
  }

  const directiveAcknowledgeMatch = path.match(/^\/manager\/directives\/([A-Za-z0-9-]+)\/acknowledge$/);
  if (directiveAcknowledgeMatch && method === 'POST') {
    const dirId = directiveAcknowledgeMatch[1];
    const directives = get<typeof SEED_DIRECTIVES>('mock_directives', []);
    const idx = directives.findIndex(d => d.directive_id === dirId);
    if (idx !== -1) {
      if (!(directives[idx].acknowledged_by as string[]).includes(body.user_email as string)) {
        (directives[idx].acknowledged_by as string[]).push(body.user_email as string);
      }
      set('mock_directives', directives);
    }
    return ok({ message: 'Acknowledged.' });
  }

  // ── Manager Officers ──────────────────────────────────────────────────────

  if (path === '/manager/officers' && method === 'GET') {
    const users = get<typeof SEED_USERS>('mock_users', []);
    return ok(users.filter(u => u.role === 'Safety Officer' && u.is_active));
  }

  // ── Manager / Officer Tasks ───────────────────────────────────────────────

  if (path === '/manager/tasks' && method === 'GET') {
    return ok(get('mock_tasks', []));
  }

  if (path === '/manager/tasks' && method === 'POST') {
    const tasks = get<typeof SEED_OFFICER_TASKS>('mock_tasks', []);
    const newTask = {
      task_id: `TSK-${uid().slice(0, 6)}`,
      event_id: body.event_id, event_code: body.event_code || '',
      assigned_to_email: body.assigned_to_email, assigned_to_name: body.assigned_to_name || 'Officer',
      assigned_by: body.assigned_by || 'HSE Manager Lead', assigned_at: now(),
      due_date: body.due_date || new Date(Date.now() + 172_800_000).toISOString(),
      task_type: body.task_type || 'Field Investigation', priority: body.priority || 'HIGH',
      description: body.description || 'Investigate and report findings.',
      status: 'Pending', findings: null, corrective_actions: null, completed_at: null,
      is_recheck: body.is_recheck || false, recheck_notes: body.recheck_notes || null,
    };
    tasks.unshift(newTask);
    set('mock_tasks', tasks);
    addAudit('TASK_ASSIGNED', `Task ${newTask.task_id} assigned to ${body.assigned_to_name} for event ${body.event_id}.`);
    return ok(newTask);
  }

  const taskActionMatch = path.match(/^\/(?:manager|officer)\/tasks\/([A-Za-z0-9-]+)\/?(.+)?$/);
  if (taskActionMatch) {
    const taskId = taskActionMatch[1];
    const action = taskActionMatch[2];
    const tasks = get<typeof SEED_OFFICER_TASKS>('mock_tasks', []);
    const idx = tasks.findIndex(t => t.task_id === taskId);

    if (method === 'GET' && !action) {
      if (idx === -1) return err(404, 'Task not found.');
      return ok(tasks[idx]);
    }

    if (action === 'approve' && method === 'POST') {
      if (idx !== -1) { tasks[idx].status = 'Verified'; set('mock_tasks', tasks); addAudit('TASK_APPROVED', `Task ${taskId} approved by manager.`); }
      return ok(tasks[idx] || { message: 'Approved' });
    }
    if (action === 'reject' && method === 'POST') {
      if (idx !== -1) { tasks[idx].status = 'Rejected'; tasks[idx].recheck_notes = body.recheck_notes || 'Needs more detail.'; set('mock_tasks', tasks); addAudit('TASK_REJECTED', `Task ${taskId} rejected by manager. Recheck required.`); }
      return ok(tasks[idx] || { message: 'Rejected' });
    }
    if (action === 'submit-recheck' && method === 'POST') {
      if (idx !== -1) { tasks[idx].status = 'Submitted'; tasks[idx].findings = body.findings; tasks[idx].corrective_actions = body.corrective_actions; tasks[idx].completed_at = now(); set('mock_tasks', tasks); addAudit('TASK_RECHECKED', `Task ${taskId} recheck submitted.`); }
      return ok(tasks[idx] || { message: 'Recheck submitted' });
    }
    if (method === 'PUT') {
      if (idx !== -1) { tasks[idx] = { ...tasks[idx], ...body }; if (body.status === 'Submitted') tasks[idx].completed_at = now(); set('mock_tasks', tasks); addAudit('TASK_UPDATED', `Task ${taskId} updated.`); }
      return ok(tasks[idx] || { message: 'Updated' });
    }
  }

  // ── Sites ─────────────────────────────────────────────────────────────────

  const siteByCodeMatch = path.match(/^\/sites\/(.+)$/);
  if (siteByCodeMatch && method === 'GET') {
    const siteCode = decodeURIComponent(siteByCodeMatch[1]);
    const sites = get<typeof SEED_SITES>('mock_sites', []);
    const found = sites.find(s => s.code === siteCode || s.name === siteCode);
    if (!found) return err(404, 'Site not found.');
    const events = get<typeof SEED_EVENTS>('mock_events', []);
    const siteEvents = events.filter(e => e.site === found.name).slice(0, 5);
    return ok({ ...found, recent_events: siteEvents, event_count: siteEvents.length });
  }

  // ── Life Saving Rules ─────────────────────────────────────────────────────

  if (path === '/life-saving-rules' && method === 'GET') {
    return ok(get('mock_lsr', []));
  }

  // ── Precursors ────────────────────────────────────────────────────────────

  if (path === '/precursors' && method === 'GET') {
    return ok(get('mock_precursors', []));
  }

  // ── SIF / SIF Risk ────────────────────────────────────────────────────────

  if (path === '/sif' && method === 'GET') {
    const events = get<typeof SEED_EVENTS>('mock_events', []);
    return ok(events.filter(e => e.is_sif_precursor === 'Yes' || e.sif_probability >= 0.7));
  }

  if (path === '/sif-risk/analyze' && method === 'POST') {
    const desc = (body.description || '').toLowerCase();
    const sifWords = ['fall', 'flame', 'explosion', 'confined', 'loto', 'lockout', 'toxic', 'gas', 'electr', 'crush', 'height'];
    const matchCount = sifWords.filter(w => desc.includes(w)).length;
    const score = Math.min(10, parseFloat((3.5 + matchCount * 0.9).toFixed(1)));
    const riskLevel = score >= 8.5 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW';
    return ok({ sif_risk_score: score, risk_level: riskLevel, sif_probability: parseFloat((score / 10).toFixed(2)), analysis: `SIF Risk Analysis: Score ${score}/10. ${riskLevel} risk classification.`, recommended_action: score >= 8 ? 'Immediate intervention required.' : 'Monitor and review.' });
  }

  // ── Events Classify ───────────────────────────────────────────────────────

  if (path.startsWith('/events/classify-words') || path.startsWith('/ai/classify-words')) {
    const text = decodeURIComponent(query.text || '');
    const sifWords = ['fall', 'fire', 'explosion', 'gas', 'toxic', 'loto', 'confined', 'height', 'energy', 'crush', 'electr'];
    const matched = sifWords.filter(w => text.toLowerCase().includes(w));
    return ok({ matched_words: matched, sif_potential: matched.length >= 2 ? 'High' : 'Medium', condition: matched.length >= 1 ? 'Unsafe Act' : 'Near Miss' });
  }

  // ── Events Analyze ────────────────────────────────────────────────────────

  if (path === '/events/analyze' && method === 'POST') {
    const desc = (body.description || body.raw_text || '').toLowerCase();
    const sifWords = ['fall', 'flame', 'explosion', 'confined', 'loto', 'lockout', 'toxic', 'gas', 'electr', 'crush', 'height'];
    const matchCount = sifWords.filter(w => desc.includes(w)).length;
    const sifProb = Math.min(0.95, 0.35 + matchCount * 0.12);
    const riskScore = parseFloat((sifProb * 10).toFixed(1));
    const riskLevel = riskScore >= 8.5 ? 'CRITICAL' : riskScore >= 7 ? 'HIGH' : riskScore >= 5 ? 'MEDIUM' : 'LOW';
    return ok({
      sif_potential: riskScore >= 8.5 ? 'Critical' : riskScore >= 7 ? 'High' : riskScore >= 5 ? 'Medium' : 'Low',
      sif_probability: sifProb, sif_risk_score: riskScore, risk_level: riskLevel,
      condition: 'Unsafe Act', event: desc.slice(0, 80) + (desc.length > 80 ? '...' : ''),
      actual_injury: 'None reported', classification: sifProb >= 0.7 ? 'SIF Precursor' : 'Precursor',
      confidence: parseFloat((sifProb * 0.95).toFixed(2)), rationale: `${matchCount} SIF keyword(s) detected in report. Risk scored at ${riskScore}/10.`,
      matched_words: sifWords.filter(w => desc.includes(w)),
    });
  }

  // ── Learning ──────────────────────────────────────────────────────────────

  if (path === '/learning' && method === 'GET') {
    return ok(get('mock_learning', []));
  }

  // ── AI Chat ───────────────────────────────────────────────────────────────

  if (path === '/ai/chat' && method === 'POST') {
    const msg = (body.message || '').toLowerCase();
    let reply = 'I am the GATI Safety Intelligence Engine. Ask me about SIF precursors, safety events, risk assessment, or life-saving rules.';
    if (msg.includes('sif')) reply = 'SIF (Serious Injury or Fatality) events are identified by their high-energy sources, critical barrier failures, and life-saving rule violations. The platform currently shows ' + get<typeof SEED_EVENTS>('mock_events', []).filter(e => e.is_sif_precursor === 'Yes').length + ' active SIF precursor events requiring urgent review.';
    if (msg.includes('critical')) reply = 'There are ' + get<typeof SEED_EVENTS>('mock_events', []).filter(e => e.risk_level === 'CRITICAL').length + ' CRITICAL risk events in the system. Immediate attention is required for these events to prevent serious injuries or fatalities.';
    if (msg.includes('lsr') || msg.includes('life-saving')) reply = 'The platform tracks compliance with all 10 IOGP Life-Saving Rules. The highest violation rates are currently in: Working at Height (18 reports), Energy Isolation (14 reports), and Hot Work (11 reports).';
    if (msg.includes('precursor')) reply = 'Precursor patterns are early warning signals of SIF events. The system has detected 3 active precursor clusters: LOTO Non-Compliance, Working-at-Height Harness Gap, and Hot Work Permit Lapses.';
    return ok({ reply, timestamp: now() });
  }

  // ── Seed Reset ────────────────────────────────────────────────────────────

  if (path === '/seed/reset' && method === 'POST') {
    localStorage.removeItem(INITIALIZED_KEY);
    initializeMockStore();
    return ok({ success: true, message: 'Database reset and re-seeded with demo data successfully.' });
  }

  // ── Upload (no-op) ────────────────────────────────────────────────────────

  if ((path === '/upload' || path === '/cloudinary/upload') && method === 'POST') {
    return ok({ url: null, public_id: null, message: 'File upload not available in standalone mode.' });
  }

  // ── Voice (no-op) ─────────────────────────────────────────────────────────

  if (path.startsWith('/voice/')) {
    return ok({ status: 'offline', message: 'Voice transcription requires server mode. Use text input instead.' });
  }

  // ── Default fallback ──────────────────────────────────────────────────────

  console.warn('[MockService] Unhandled route:', method, path);
  return err(404, `Endpoint not available in standalone mode: ${method} /api${path}`);
}

// ─── Public API: Patched Fetch ────────────────────────────────────────────────

/**
 * Install the mock fetch interceptor.
 * Call this once at app startup (before React renders).
 */
export function installMockFetch(): void {
  initializeMockStore();

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Only intercept /api/* calls (relative or absolute localhost)
    const isApiCall = url.includes('/api/');
    if (!isApiCall) {
      return originalFetch(input, init);
    }

    // Simulate slight network delay for realism
    await new Promise(r => setTimeout(r, 20 + Math.random() * 80));

    try {
      return await handleMockRequest(url, init);
    } catch (e) {
      console.error('[MockService] Error handling request:', url, e);
      return err(500, 'Internal mock service error.');
    }
  };
}
