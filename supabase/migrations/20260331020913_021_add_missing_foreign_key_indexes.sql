/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for unindexed foreign keys to improve JOIN performance
    - These indexes optimize query performance when filtering or joining on foreign key columns

  2. Tables Affected
    - audit_logs: performed_by index
    - notifications: ticket_id index
    - system_settings: updated_by index
    - ticket_assignment_history: assigned_by, from_agent_id, to_agent_id indexes
    - tickets: created_by, department_id, sla_policy_id, subcategory_id indexes
*/

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON notifications(ticket_id);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

CREATE INDEX IF NOT EXISTS idx_ticket_assignment_history_assigned_by ON ticket_assignment_history(assigned_by);
CREATE INDEX IF NOT EXISTS idx_ticket_assignment_history_from_agent_id ON ticket_assignment_history(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignment_history_to_agent_id ON ticket_assignment_history(to_agent_id);

CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_department_id ON tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_policy_id ON tickets(sla_policy_id);
CREATE INDEX IF NOT EXISTS idx_tickets_subcategory_id ON tickets(subcategory_id);
