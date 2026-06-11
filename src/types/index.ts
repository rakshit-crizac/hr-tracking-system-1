export type UserRole = 'employee' | 'hr_agent' | 'admin';

export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'waiting_for_employee'
  | 'waiting_for_internal_review'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'escalated';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketSource = 'portal' | 'email' | 'phone' | 'walk_in';

export type EscalationStatus = 'none' | 'pending' | 'escalated' | 'resolved';

export type PendingWith = 'employee' | 'hr_agent' | 'internal' | 'none';

export interface User {
  id: string;
  employee_code: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  department?: Department;
  is_hr_agent: boolean;
  is_admin: boolean;
  is_active: boolean;
  is_posh_handler: boolean;
  last_assigned_at: string | null;
  current_ticket_count: number;
  created_at: string;
  updated_at: string;
  mapped_categories?: Category[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_sensitive: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SLAPolicy {
  id: string;
  category_id: string;
  priority: TicketPriority;
  acknowledgement_hours: number;
  resolution_hours: number;
  first_action_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursConfig {
  id: string;
  timezone: string;
  cutoff_time: string;
  exclude_non_working_days: boolean;
  break_enabled: boolean;
  break_start: string;
  break_end: string;
  created_at: string;
  updated_at: string;
}

export interface SLAPreviewResult {
  deadline: Date;
  breakdown: SLABreakdownStep[];
  totalBusinessMinutes: number;
  workingDaysUsed: number;
  holidaysSkipped: string[];
}

export interface SLABreakdownStep {
  date: string;
  dayName: string;
  minutesUsed: number;
  hoursUsed: string;
  isHoliday: boolean;
  note: string;
}

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category_id: string;
  category?: Category;
  subcategory_id: string | null;
  subcategory?: Subcategory;
  requester_id: string;
  requester?: User;
  requester_name: string;
  department_id: string | null;
  department?: Department;
  priority: TicketPriority;
  source: TicketSource;
  assigned_agent_id: string | null;
  assigned_agent?: User;
  status: TicketStatus;
  sla_policy_id: string | null;
  sla_policy?: SLAPolicy;
  acknowledgement_due_at: string | null;
  resolution_due_at: string | null;
  first_response_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  reopened_count: number;
  escalation_status: EscalationStatus;
  escalation_level: number;
  is_acknowledgement_breached: boolean;
  is_resolution_breached: boolean;
  breach_reason: string | null;
  employee_rating: number | null;
  rating_comment: string | null;
  closure_notes: string | null;
  is_sensitive: boolean;
  sla_paused_at: string | null;
  sla_pause_duration_minutes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_updated_by: string | null;
  last_updated_by_name: string | null;
  last_visible_reply_at: string | null;
  last_visible_reply_by: string | null;
  pending_with: PendingWith;
  next_action_expected: string | null;
  reopen_reason: string | null;
  is_read_only: boolean;
  comments?: TicketComment[];
  assignment_history?: TicketAssignmentHistory[];
}

export interface TicketAssignmentHistory {
  id: string;
  ticket_id: string;
  ticket_number: string;
  from_agent_id: string | null;
  from_agent_name: string | null;
  to_agent_id: string | null;
  to_agent_name: string | null;
  assignment_reason: string | null;
  assigned_by: string;
  assigned_by_name: string;
  created_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  ticket_number: string | null;
  action: string;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_by_name: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  ticket_id: string | null;
  ticket_number: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCategoryMapping {
  id: string;
  agent_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agent?: User;
  category?: Category;
}

export interface EscalationRule {
  id: string;
  category_id: string | null;
  level: number;
  trigger_after_hours: number;
  notify_user_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/*
 * ============================================================================
 * AUTHENTICATION TYPES & API CONTRACT
 * ============================================================================
 *
 * DEVELOPER NOTE: When integrating with company SSO/LDAP/AD login API:
 *
 * 1. REQUEST PAYLOAD (what your company API expects):
 *    POST /api/auth/login
 *    {
 *      "username": string,     // Employee ID or email
 *      "password": string,     // User's password
 *      "domain"?: string       // Optional: AD domain if applicable
 *    }
 *
 * 2. EXPECTED RESPONSE PAYLOAD (what the API should return):
 *    {
 *      "success": boolean,
 *      "token": string | null,           // JWT or session token
 *      "refresh_token"?: string | null,  // For token refresh
 *      "expires_at"?: string,            // Token expiration timestamp
 *      "user": {
 *        "id": string,
 *        "employee_code": string,
 *        "email": string,
 *        "full_name": string,
 *        "department_id": string | null,
 *        "role": "employee" | "hr_agent" | "admin"
 *      } | null,
 *      "permissions"?: string[],          // e.g., ["view_tickets", "manage_users"]
 *      "error"?: { code: string, message: string }
 *    }
 *
 * 3. HOW ROLES ARE DETERMINED:
 *    - Role comes from the API response (user.role)
 *    - is_admin: role === 'admin'
 *    - is_hr_agent: role === 'hr_agent' OR is_hr_agent flag from DB
 *    - is_employee: default role if not admin or HR agent
 *    - Permissions array can override specific capabilities
 *
 * 4. SESSION MANAGEMENT:
 *    - Token stored in localStorage (hr_ticketing_session)
 *    - User data stored separately (hr_ticketing_user)
 *    - Session validated on each protected route access
 *    - Auto-refresh token before expiration (if refresh_token provided)
 * ============================================================================
 */

export interface AuthCredentials {
  username: string;
  password: string;
  domain?: string;
}

export interface AuthToken {
  token: string;
  refresh_token?: string;
  expires_at?: string;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_DISABLED'
  | 'ACCOUNT_LOCKED'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export type UserPermission =
  | 'view_own_tickets'
  | 'create_tickets'
  | 'view_all_tickets'
  | 'manage_tickets'
  | 'view_reports'
  | 'manage_users'
  | 'manage_categories'
  | 'manage_sla'
  | 'manage_settings'
  | 'view_audit_logs';

export interface AuthResponse {
  success: boolean;
  token?: AuthToken | null;
  user: User | null;
  permissions?: UserPermission[];
  error?: AuthError;
}

export interface AuthSession {
  user: User;
  token: AuthToken | null;
  permissions: UserPermission[];
  authenticated_at: string;
  last_activity_at: string;
}

export type SLAStatus = 'on_track' | 'warning' | 'critical' | 'breached';

export interface SLASettings {
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  reopen_window_hours: number;
  reopened_sla_reduction_percent: number;
  auto_close_resolved_after_hours: number;
  auto_close_days: number;
  waiting_for_employee_pauses_sla: boolean;
  internal_review_pauses_sla: boolean;
  sla_pause_on_external_dependency: boolean;
  sla_pause_on_approval: boolean;
  enable_auto_escalation: boolean;
  escalation_level_1_percent: number;
  escalation_level_2_percent: number;
  require_breach_reason: boolean;
  auto_tag_breached_tickets: boolean;
  separate_breached_queue: boolean;
  apply_sla_to_all_categories: boolean;
  allow_category_sla_override: boolean;
  enable_reopened_sla_logic: boolean;
}