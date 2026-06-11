/*
  # Expand SLA System Settings for Control Center

  1. New Settings Added
    - `sla_pause_on_external_dependency` - Pause SLA when waiting for external party
    - `sla_pause_on_approval` - Pause SLA when pending approval
    - `auto_close_days` - Days after resolved to auto-close
    - `enable_auto_escalation` - Toggle for automatic escalation
    - `escalation_level_1_percent` - First escalation threshold
    - `escalation_level_2_percent` - Second escalation threshold (breach)
    - `require_breach_reason` - Require agents to provide reason for breach
    - `auto_tag_breached_tickets` - Auto-tag tickets that breach SLA
    - `separate_breached_queue` - Show breached tickets in separate queue
    - `apply_sla_to_all_categories` - Global SLA application
    - `allow_category_sla_override` - Allow category-specific SLA
    - `enable_reopened_sla_logic` - Different SLA for reopened tickets

  2. Cleanup
    - Remove duplicate settings (keep normalized naming)

  3. Notes
    - All settings have sensible defaults
    - Value column is JSONB type
*/

DELETE FROM system_settings WHERE key IN (
  'auto_close_resolved_hours',
  'sla_danger_threshold_percent',
  'waiting_for_internal_review_pauses_sla'
);

INSERT INTO system_settings (key, value, description)
VALUES
  ('sla_pause_on_external_dependency', 'false'::jsonb, 'Pause SLA when ticket status is Waiting for External Dependency'),
  ('sla_pause_on_approval', 'false'::jsonb, 'Pause SLA when ticket is pending approval'),
  ('auto_close_days', '3'::jsonb, 'Days after resolved status to auto-close ticket'),
  ('enable_auto_escalation', 'true'::jsonb, 'Enable automatic escalation when SLA thresholds reached'),
  ('escalation_level_1_percent', '90'::jsonb, 'SLA consumption percentage for first escalation'),
  ('escalation_level_2_percent', '100'::jsonb, 'SLA consumption percentage for second escalation (breach)'),
  ('require_breach_reason', 'false'::jsonb, 'Require agents to provide reason when SLA is breached'),
  ('auto_tag_breached_tickets', 'true'::jsonb, 'Automatically tag tickets that breach SLA'),
  ('separate_breached_queue', 'true'::jsonb, 'Show breached tickets in a separate queue'),
  ('apply_sla_to_all_categories', 'true'::jsonb, 'Apply SLA policies to all ticket categories'),
  ('allow_category_sla_override', 'true'::jsonb, 'Allow categories to have their own SLA settings'),
  ('enable_reopened_sla_logic', 'true'::jsonb, 'Apply reduced SLA to reopened tickets')
ON CONFLICT (key) DO NOTHING;