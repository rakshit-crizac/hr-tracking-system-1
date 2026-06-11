/*
  # Seed Categories and SLA Policies
  
  1. Initial Data
    - 8 HR ticket categories with proper codes
    - SLA policies for each category and priority level
    - Business hours configuration (Mon-Fri 9:00-18:00)
    - Default system settings
  
  2. Categories:
    - Attendance & Leave
    - Payroll & Compensation
    - Recruitment & Onboarding
    - Employee Relations
    - POSH / Sensitive Concerns (marked as sensitive)
    - Performance & Growth
    - Policy & Compliance
    - General Support
*/

-- Insert categories
INSERT INTO ticket_categories (name, code, description, is_sensitive, display_order) VALUES
  ('Attendance & Leave', 'ATT_LEAVE', 'Leave applications, attendance corrections, work from home requests', false, 1),
  ('Payroll & Compensation', 'PAYROLL', 'Salary queries, tax declarations, reimbursements, bonus inquiries', false, 2),
  ('Recruitment & Onboarding', 'RECRUIT', 'New hire onboarding, documentation, joining formalities', false, 3),
  ('Employee Relations', 'EMP_REL', 'Workplace concerns, team conflicts, manager feedback', false, 4),
  ('POSH / Sensitive Concerns', 'POSH', 'Harassment complaints, sensitive workplace issues - strictly confidential', true, 5),
  ('Performance & Growth', 'PERF', 'Appraisals, promotions, training requests, career development', false, 6),
  ('Policy & Compliance', 'POLICY', 'HR policy clarifications, compliance queries, documentation', false, 7),
  ('General Support', 'GENERAL', 'General HR queries, ID cards, letters, certificates', false, 8)
ON CONFLICT (code) DO NOTHING;

-- Insert SLA policies for each category
-- Attendance & Leave SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 4, 8 FROM ticket_categories WHERE code = 'ATT_LEAVE'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 4, 8 FROM ticket_categories WHERE code = 'ATT_LEAVE'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 4, 8 FROM ticket_categories WHERE code = 'ATT_LEAVE'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 4, 4 FROM ticket_categories WHERE code = 'ATT_LEAVE'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Payroll & Compensation SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 2, 8 FROM ticket_categories WHERE code = 'PAYROLL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 2, 8 FROM ticket_categories WHERE code = 'PAYROLL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 2, 4 FROM ticket_categories WHERE code = 'PAYROLL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 2, 2 FROM ticket_categories WHERE code = 'PAYROLL'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Recruitment & Onboarding SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 4, 16 FROM ticket_categories WHERE code = 'RECRUIT'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 4, 16 FROM ticket_categories WHERE code = 'RECRUIT'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 4, 8 FROM ticket_categories WHERE code = 'RECRUIT'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 4, 8 FROM ticket_categories WHERE code = 'RECRUIT'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Employee Relations SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 2, 24 FROM ticket_categories WHERE code = 'EMP_REL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 2, 16 FROM ticket_categories WHERE code = 'EMP_REL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 2, 8 FROM ticket_categories WHERE code = 'EMP_REL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours, first_action_hours)
SELECT id, 'critical', 2, 4, 4 FROM ticket_categories WHERE code = 'EMP_REL'
ON CONFLICT (category_id, priority) DO NOTHING;

-- POSH / Sensitive SLA (uses first_action_hours instead of resolution)
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours, first_action_hours)
SELECT id, 'low', 1, 72, 2 FROM ticket_categories WHERE code = 'POSH'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours, first_action_hours)
SELECT id, 'medium', 1, 72, 2 FROM ticket_categories WHERE code = 'POSH'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours, first_action_hours)
SELECT id, 'high', 1, 48, 2 FROM ticket_categories WHERE code = 'POSH'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours, first_action_hours)
SELECT id, 'critical', 1, 24, 2 FROM ticket_categories WHERE code = 'POSH'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Performance & Growth SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 4, 24 FROM ticket_categories WHERE code = 'PERF'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 4, 16 FROM ticket_categories WHERE code = 'PERF'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 4, 8 FROM ticket_categories WHERE code = 'PERF'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 4, 8 FROM ticket_categories WHERE code = 'PERF'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Policy & Compliance SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 2, 8 FROM ticket_categories WHERE code = 'POLICY'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 2, 8 FROM ticket_categories WHERE code = 'POLICY'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 2, 4 FROM ticket_categories WHERE code = 'POLICY'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 2, 2 FROM ticket_categories WHERE code = 'POLICY'
ON CONFLICT (category_id, priority) DO NOTHING;

-- General Support SLA
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'low', 4, 24 FROM ticket_categories WHERE code = 'GENERAL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'medium', 4, 16 FROM ticket_categories WHERE code = 'GENERAL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'high', 4, 8 FROM ticket_categories WHERE code = 'GENERAL'
ON CONFLICT (category_id, priority) DO NOTHING;
INSERT INTO sla_policies (category_id, priority, acknowledgement_hours, resolution_hours)
SELECT id, 'critical', 4, 8 FROM ticket_categories WHERE code = 'GENERAL'
ON CONFLICT (category_id, priority) DO NOTHING;

-- Insert business hours (Monday to Friday, 9:00 to 18:00)
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES
  (0, '09:00:00', '18:00:00', false),  -- Sunday
  (1, '09:00:00', '18:00:00', true),   -- Monday
  (2, '09:00:00', '18:00:00', true),   -- Tuesday
  (3, '09:00:00', '18:00:00', true),   -- Wednesday
  (4, '09:00:00', '18:00:00', true),   -- Thursday
  (5, '09:00:00', '18:00:00', true),   -- Friday
  (6, '09:00:00', '18:00:00', false)   -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('reopen_window_hours', '48', 'Hours within which a resolved ticket can be reopened'),
  ('reopened_sla_reduction_percent', '50', 'Percentage reduction in SLA for reopened tickets'),
  ('waiting_for_employee_pauses_sla', 'true', 'Whether waiting for employee status pauses SLA'),
  ('internal_review_pauses_sla', 'false', 'Whether internal review status pauses resolution SLA'),
  ('auto_close_resolved_after_hours', '72', 'Hours after which resolved tickets auto-close'),
  ('sla_warning_threshold_percent', '75', 'Percentage at which SLA warning is shown'),
  ('sla_critical_threshold_percent', '90', 'Percentage at which SLA is critical')
ON CONFLICT (key) DO NOTHING;