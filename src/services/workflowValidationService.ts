import { Ticket, TicketStatus, User, PendingWith } from '../types';
import { supabase } from '../lib/supabase';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TransitionContext {
  ticket: Ticket;
  user: User;
  newStatus: TicketStatus;
  closureNotes?: string;
  reopenReason?: string;
  hasPublicReply?: boolean;
}

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['assigned', 'acknowledged', 'closed'],
  assigned: ['acknowledged', 'in_progress', 'open'],
  acknowledged: ['in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'resolved', 'escalated'],
  in_progress: ['waiting_for_employee', 'waiting_for_internal_review', 'resolved', 'escalated'],
  waiting_for_employee: ['in_progress', 'resolved', 'escalated'],
  waiting_for_internal_review: ['in_progress', 'escalated', 'resolved'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'acknowledged', 'in_progress', 'resolved'],
  escalated: ['in_progress', 'waiting_for_internal_review', 'resolved']
};

const EMPLOYEE_FORBIDDEN_TRANSITIONS: TicketStatus[] = ['closed', 'resolved'];

const STATUS_TO_PENDING_WITH: Record<TicketStatus, PendingWith> = {
  open: 'hr_agent',
  assigned: 'hr_agent',
  acknowledged: 'hr_agent',
  in_progress: 'hr_agent',
  waiting_for_employee: 'employee',
  waiting_for_internal_review: 'internal',
  resolved: 'employee',
  closed: 'none',
  reopened: 'hr_agent',
  escalated: 'internal'
};

export function getPendingWithForStatus(status: TicketStatus): PendingWith {
  return STATUS_TO_PENDING_WITH[status] || 'none';
}

export function getNextActionExpected(status: TicketStatus): string {
  const actionMap: Record<TicketStatus, string> = {
    open: 'Ticket needs to be assigned to an agent',
    assigned: 'Agent needs to acknowledge the ticket',
    acknowledged: 'Agent needs to start working on the ticket',
    in_progress: 'Agent is working on resolution',
    waiting_for_employee: 'Awaiting response from employee',
    waiting_for_internal_review: 'Awaiting internal review/approval',
    resolved: 'Employee should confirm resolution or reopen if issue persists',
    closed: 'Ticket is complete - no action required',
    reopened: 'Agent needs to review and address reopened concerns',
    escalated: 'Escalation team needs to review and take action'
  };
  return actionMap[status] || 'Review ticket status';
}

export function isTransitionAllowed(
  fromStatus: TicketStatus,
  toStatus: TicketStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[fromStatus];
  return allowedTransitions?.includes(toStatus) ?? false;
}

export function getAllowedTransitions(currentStatus: TicketStatus): TicketStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

export async function validateStatusTransition(
  context: TransitionContext
): Promise<ValidationResult> {
  const { ticket, user, newStatus, closureNotes, reopenReason, hasPublicReply } = context;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (ticket.is_read_only && !user.is_admin) {
    errors.push('This ticket is read-only and cannot be modified');
    return { valid: false, errors, warnings };
  }

  if (!isTransitionAllowed(ticket.status, newStatus)) {
    errors.push(
      `Cannot transition from "${formatStatus(ticket.status)}" to "${formatStatus(newStatus)}". ` +
      `Allowed transitions: ${getAllowedTransitions(ticket.status).map(formatStatus).join(', ') || 'none'}`
    );
  }

  if (!user.is_admin && !user.is_hr_agent && EMPLOYEE_FORBIDDEN_TRANSITIONS.includes(newStatus)) {
    errors.push('Employees cannot directly close or resolve tickets');
  }

  if (newStatus === 'resolved' && !closureNotes?.trim()) {
    errors.push('Closure notes are required when resolving a ticket');
  }

  if (newStatus === 'waiting_for_employee' && !hasPublicReply) {
    errors.push('A public reply must be sent before moving to "Waiting for Employee"');
  }

  if (newStatus === 'reopened' && !reopenReason?.trim()) {
    errors.push('A reason is required when reopening a ticket');
  }

  if (user.is_hr_agent && !user.is_admin) {
    const hasAccess = await validateAgentCategoryAccess(user.id, ticket.category_id, ticket.is_sensitive);
    if (!hasAccess) {
      errors.push('You are not authorized to handle tickets in this category');
    }
  }

  if (ticket.is_sensitive && !user.is_admin) {
    const canAccess = await canAccessSensitiveTicket(user.id, ticket.id);
    if (!canAccess) {
      errors.push('You are not authorized to access sensitive tickets');
    }
  }

  if (newStatus === 'resolved' && ticket.reopened_count >= 2) {
    warnings.push('This ticket has been reopened multiple times. Consider reviewing the root cause.');
  }

  if (ticket.is_acknowledgement_breached || ticket.is_resolution_breached) {
    warnings.push('This ticket has SLA breaches that should be documented.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export async function validateTicketUpdate(
  ticket: Ticket,
  user: User,
  updates: Partial<Ticket>
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (ticket.is_read_only && !user.is_admin) {
    errors.push('This ticket is read-only and cannot be modified');
    return { valid: false, errors, warnings };
  }

  if (ticket.status === 'closed' && !user.is_admin) {
    const allowedUpdates = ['employee_rating', 'rating_comment'];
    const attemptedUpdates = Object.keys(updates);
    const disallowedUpdates = attemptedUpdates.filter(k => !allowedUpdates.includes(k));

    if (disallowedUpdates.length > 0) {
      errors.push('Closed tickets can only be updated for rating by non-admin users');
    }
  }

  if (user.is_hr_agent && !user.is_admin) {
    const hasAccess = await validateAgentCategoryAccess(user.id, ticket.category_id, ticket.is_sensitive);
    if (!hasAccess) {
      errors.push('You are not authorized to modify tickets in this category');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export async function validateTicketView(
  ticket: Ticket,
  user: User
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (ticket.requester_id === user.id || ticket.created_by === user.id) {
    return { valid: true, errors, warnings };
  }

  if (user.is_admin) {
    return { valid: true, errors, warnings };
  }

  if (user.is_hr_agent) {
    if (ticket.assigned_agent_id === user.id) {
      return { valid: true, errors, warnings };
    }

    if (ticket.is_sensitive) {
      const canAccess = await canAccessSensitiveTicket(user.id, ticket.id);
      if (!canAccess) {
        errors.push('You are not authorized to view sensitive tickets');
        return { valid: false, errors, warnings };
      }
    } else {
      const hasAccess = await validateAgentCategoryAccess(user.id, ticket.category_id, false);
      if (!hasAccess) {
        errors.push('You are not mapped to handle tickets in this category');
        return { valid: false, errors, warnings };
      }
    }

    return { valid: true, errors, warnings };
  }

  errors.push('You do not have permission to view this ticket');
  return { valid: false, errors, warnings };
}

export async function validateAssignment(
  ticket: Ticket,
  newAgentId: string,
  user: User,
  reason?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (ticket.is_read_only && !user.is_admin) {
    errors.push('This ticket is read-only and cannot be reassigned');
    return { valid: false, errors, warnings };
  }

  if (!user.is_admin && !user.is_hr_agent) {
    errors.push('Only HR agents and admins can assign tickets');
    return { valid: false, errors, warnings };
  }

  if (ticket.assigned_agent_id && !reason?.trim()) {
    errors.push('A reason is required when reassigning a ticket');
  }

  const hasAccess = await validateAgentCategoryAccess(newAgentId, ticket.category_id, ticket.is_sensitive);
  if (!hasAccess) {
    errors.push('The selected agent is not authorized to handle tickets in this category');
  }

  const { data: newAgent } = await supabase
    .from('users')
    .select('is_active, full_name')
    .eq('id', newAgentId)
    .maybeSingle();

  if (!newAgent?.is_active) {
    errors.push('Cannot assign ticket to an inactive agent');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function validateAgentCategoryAccess(
  agentId: string,
  categoryId: string,
  isSensitive: boolean
): Promise<boolean> {
  if (isSensitive) {
    const { data: user } = await supabase
      .from('users')
      .select('is_posh_handler, is_admin')
      .eq('id', agentId)
      .maybeSingle();

    return user?.is_posh_handler === true || user?.is_admin === true;
  }

  const { data: mapping } = await supabase
    .from('agent_category_mappings')
    .select('id')
    .eq('agent_id', agentId)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .maybeSingle();

  return mapping !== null;
}

async function canAccessSensitiveTicket(userId: string, ticketId: string): Promise<boolean> {
  const { data: user } = await supabase
    .from('users')
    .select('is_posh_handler, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (user?.is_admin || user?.is_posh_handler) {
    return true;
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('assigned_agent_id, requester_id, created_by')
    .eq('id', ticketId)
    .maybeSingle();

  return ticket?.assigned_agent_id === userId ||
         ticket?.requester_id === userId ||
         ticket?.created_by === userId;
}

function formatStatus(status: TicketStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export async function checkAndLogSLABreach(ticket: Ticket): Promise<void> {
  const now = new Date();
  const updates: Record<string, unknown> = {};
  let breachLogged = false;

  if (!ticket.is_acknowledgement_breached &&
      ticket.acknowledgement_due_at &&
      !ticket.acknowledged_at &&
      new Date(ticket.acknowledgement_due_at) < now) {
    updates.is_acknowledgement_breached = true;
    updates.breach_reason = (ticket.breach_reason || '') +
      `\nAcknowledgement SLA breached at ${now.toISOString()}`;
    breachLogged = true;
  }

  if (!ticket.is_resolution_breached &&
      ticket.resolution_due_at &&
      !ticket.resolved_at &&
      new Date(ticket.resolution_due_at) < now) {
    updates.is_resolution_breached = true;
    updates.breach_reason = (updates.breach_reason as string || ticket.breach_reason || '') +
      `\nResolution SLA breached at ${now.toISOString()}`;
    breachLogged = true;
  }

  if (breachLogged) {
    await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticket.id);

    await supabase.from('audit_logs').insert({
      entity_type: 'ticket',
      entity_id: ticket.id,
      ticket_number: ticket.ticket_number,
      action: 'sla_breach',
      description: ticket.is_acknowledgement_breached && ticket.is_resolution_breached
        ? 'Both acknowledgement and resolution SLA breached'
        : ticket.is_acknowledgement_breached
        ? 'Acknowledgement SLA breached'
        : 'Resolution SLA breached',
      old_values: null,
      new_values: updates,
      performed_by: null,
      performed_by_name: 'System'
    });
  }
}
