export interface User {
  id?: number;
  email: string;
  name: string;
  role: string;
  id_number?: string;
  phone?: string;
  address?: string;
  approval_status?: string;
  is_active?: boolean;
  created_at?: string;
  token?: string;
}

export interface Site {
  id: number;
  name: string;
  code: string;
  location: string;
}

export interface Unit {
  id: number;
  site_id: number;
  name: string;
  code: string;
}

export interface SafetyReport {
  id: number;
  report_code?: string;
  report_type?: string;
  raw_text: string;
  audio_transcript?: string | null;
  photo_url?: string | null;
  reporter_email?: string;
  hazard_category?: string;
  shift_timing?: string;
  location_detail?: string;
  equipment_involved?: string | null;
  people_involved?: number;
  timestamp: string;
  status: 'Pending' | 'Analyzed' | 'Error';
}

export interface AiSentenceClassification {
  condition: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss';
  event: string;
  actual_injury: string;
  sif_potential: 'High' | 'Critical' | 'Medium' | 'Low';
  classification: string;
  report_type?: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss';
  confidence: number;
  rationale: string;
  matched_words?: string[];
  sentence_clauses?: string[];
}

export interface SafetyEvent {
  id: string;
  report_id?: number;
  report_code?: string;
  report_type?: string;
  condition?: string;
  event?: string;
  actual_injury?: string;
  sif_potential?: string;
  classification?: string;
  reporter_name?: string;
  reported_by?: string;
  reporter_email?: string;
  hazard_category?: string;
  shift_timing?: string;
  location_detail?: string;
  is_sif_precursor?: string;
  timestamp: string;
  site: string;
  unit: string;
  location: string;
  activity: string;
  description: string;
  hazard: string;
  equipment_involved?: string | null;
  people_involved?: number;
  energy_source: string;
  barrier: string;
  barrier_failure: string;
  exposure: string;
  consequence: string;
  sif_probability: number;
  confidence: number;
  life_saving_rule: string;
  status: 'Needs Review' | 'Confirmed' | 'Corrected' | 'Non-SIF' | 'Action Dispatched' | 'Resolved';
  reviewer: string | null;
  evidence: string;
  
  // SIF-SHIELD 0-10 Composite Scoring Engine
  severity_score?: number;
  exposure_score?: number;
  barrier_score?: number;
  consequence_score?: number;
  sif_risk_score?: number;
  risk_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  // Corrective Actions & Controls
  stop_work_issued?: boolean;
  assigned_team?: string | null;
  action_id?: string | null;
  action_status?: string | null;
  resolution_notes?: string | null;
  audio_transcript?: string | null;
  photo_url?: string | null;
  
  explanation?: string | null;
  recommended_action?: string | null;
  
  // Operational Hierarchy (L1-L6)
  l1_milestone: string;
  l2_unit: string;
  l3_discipline: string;
  l4_work_package: string;
  l5_activity: string;
  l6_job: string;
}

export interface PrecursorPattern {
  id: string;
  name: string;
  occurrences: number;
  sites: number;
  activities: string;
  life_saving_rule: string;
  trend: string;
  barrier_failure: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Review {
  id: number;
  event_id: string;
  reviewer_name: string;
  original_sif: string;
  original_rule: string;
  corrected_sif: string;
  corrected_rule: string;
  timestamp: string;
}

export interface LearningEvent {
  id: number;
  review_id: number;
  event_id: string;
  original_prediction: string;
  reviewer_decision: string;
  learning_signal: string;
  timestamp: string;
}

export interface AuditEvent {
  id: number;
  event_id: string;
  action: string;
  details: string;
  user_email: string;
  timestamp: string;
}

export interface Intervention {
  id: number;
  event_id: string;
  description: string;
  status: 'Open' | 'Closed';
  assigned_to: string;
  due_date: string;
  action_taken?: string;
  created_at: string;
}

export interface KPIStats {
  total_reports: number;
  sif_potential: number;
  high_priority: number;
  open_interventions: number;
}

export interface SitePrecursorDensity {
  site: string;
  reports: number;
  sif_percentage: number;
  high_potential_count: number;
  trend: string;
}

export interface LifeSavingRuleStat {
  name: string;
  reports_count: number;
  sif_count: number;
  precursor_density: string;
  common_barrier_failure: string;
  top_site: string;
}

export interface DashboardResponse {
  kpis: KPIStats;
  site_densities: SitePrecursorDensity[];
  life_saving_rules: LifeSavingRuleStat[];
  recent_events: SafetyEvent[];
}

export interface OfficerProfile {
  id: number;
  officer_name: string;
  name?: string;
  officer_code: string;
  employee_id?: string;
  email: string;
  phone: string;
  radio_channel: string;
  site: string;
  unit: string;
  shift: string;
  status: 'On Duty' | 'In Field' | 'Standby' | 'Off Duty' | string;
  role?: string;
  certifications: string[];
  experience_years: number;
  max_capacity: number;
  open_reviews_count: number;
  active_tasks_count: number;
  completed_tasks_count: number;
  total_tasks_count: number;
  workload_score: number;
  compliance_rate: number;
}

export interface OfficerTask {
  id: number;
  task_id: string;
  title: string;
  task_type: string;
  site: string;
  unit: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  assigned_officer_id: number;
  assigned_officer_name: string;
  assigned_officer_email?: string | null;
  assigned_by: string;
  instructions: string;
  status: 'Assigned' | 'In Progress' | 'Submitted' | 'Completed' | 'Overdue' | string;
  findings?: string | null;
  submitted_findings?: string | null;
  manager_notes?: string | null;
  submitted_at?: string | null;
  due_date?: string | null;
  related_event_id?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface SafetyDirective {
  id: number;
  directive_id: string;
  title: string;
  message: string;
  priority: 'URGENT' | 'HIGH' | 'STANDARD' | string;
  target_scope?: 'ALL' | 'TEAM' | 'SITE' | 'OFFICER' | 'SHIFT' | string;
  target_name?: string;
  target_sites: string;
  issued_by: string;
  acknowledge_count: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  id_number: string;
  email: string;
  phone: string;
  address: string;
  role: 'Employee' | 'Officer' | 'Manager' | 'Admin' | string;
  approval_status: 'Pending' | 'Approved' | 'Rejected' | string;
  is_active: boolean;
  created_at: string;
}

export interface AdminDashboardData {
  kpis: {
    total_employee: number;
    total_officer: number;
    total_manager: number;
    total_admin: number;
    total_users: number;
    pending_approvals: number;
    approved_users: number;
    rejected_users: number;
    active_users: number;
    deactivated_users: number;
    total_reports: number;
  };
  charts: {
    role_distribution: { role: string; count: number; color: string }[];
    status_distribution: { status: string; count: number; color: string }[];
    issue_distribution: { type: string; count: number }[];
    severity_distribution: { severity: string; count: number; color: string }[];
  };
}

export interface AdminReport {
  id: string;
  report_code: string;
  report_type: string;
  reporter_email: string;
  reviewer: string;
  assigned_team: string;
  site: string;
  unit: string;
  location: string;
  activity: string;
  description: string;
  hazard: string;
  life_saving_rule: string;
  risk_level: string;
  sif_risk_score: number;
  is_sif_precursor: string;
  status: string;
  action_status: string;
  stop_work_issued: boolean;
  action_id?: string | null;
  resolution_notes?: string | null;
  photo_url?: string | null;
  timestamp: string;
}

export interface AuditLogEntry {
  id: number;
  event_id: string;
  action: string;
  actor_name: string;
  actor_role: string;
  details: string;
  user_email: string;
  timestamp: string;
  login_time?: string | null;
  logout_time?: string | null;
}


