import { supabase } from '../lib/supabase';
import { Ticket, Category, User, SLAPolicy, TicketComment, TicketPriority, TicketStatus, TicketAssignmentHistory } from '../types';
import { calculateSLADueDates } from './slaService';
import {
  validateStatusTransition,
  validateAssignment,
  validateTicketUpdate,
  getPendingWithForStatus,
  getNextActionExpected,
  checkAndLogSLABreach,
  ValidationResult
} from './workflowValidationService';

export class TicketWorkflowError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(message);
    this.name = 'TicketWorkflowError';
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('ticket_categories')
    .select('*, subcategories:ticket_subcategories(*)')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

export async function fetchSLAPolicy(categoryId: string, priority: TicketPriority): Promise<SLAPolicy | null> {
  const { data, error } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('category_id', categoryId)
    .eq('priority', priority)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchEligibleAgents(categoryId: string, isSensitive: boolean): Promise<User[]> {
  if (isSensitive) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_posh_handler', true)
      .eq('is_active', true)
      .order('current_ticket_count', { ascending: true })
      .order('last_assigned_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  const { data: mappings, error: mappingError } = await supabase
    .from('agent_category_mappings')
    .select('agent_id')
    .eq('category_id', categoryId)
    .eq('is_active', true);

  if (mappingError) throw mappingError;
  if (!mappings?.length) return [];

  const agentIds = mappings.map(m => m.agent_id);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', agentIds)
    .eq('is_active', true)
    .order('current_ticket_count', { ascending: true })
    .order('last_assigned_at', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data || [];
}

export async function createTicket(
  ticketData: {
    title: string;
    description: string;
    category_id: string;
    subcategory_id?: string;
    priority: TicketPriority;
    source?: string;
  },
  user: User
): Promise<Ticket> {
  const { data: category } = await supabase
    .from('ticket_categories')
    .select('*')
    .eq('id', ticketData.category_id)
    .single();

  const slaPolicy = await fetchSLAPolicy(ticketData.category_id, ticketData.priority);
  const slaDates = slaPolicy ? calculateSLADueDates(slaPolicy) : null;

  const eligibleAgents = await fetchEligibleAgents(ticketData.category_id, category?.is_sensitive || false);
  const assignedAgent = eligibleAgents[0] || null;

  const initialStatus: TicketStatus = assignedAgent ? 'assigned' : 'open';

  const insertData = {
    title: ticketData.title,
    description: ticketData.description,
    category_id: ticketData.category_id,
    subcategory_id: ticketData.subcategory_id || null,
    priority: ticketData.priority,
    source: ticketData.source || 'portal',
    requester_id: user.id,
    requester_name: user.full_name,
    department_id: user.department_id,
    assigned_agent_id: assignedAgent?.id || null,
    status: initialStatus,
    sla_policy_id: slaPolicy?.id || null,
    acknowledgement_due_at: slaDates?.acknowledgementDue || null,
    resolution_due_at: slaDates?.resolutionDue || null,
    is_sensitive: category?.is_sensitive || false,
    created_by: user.id,
    last_updated_by: user.id,
    last_updated_by_name: user.full_name,
    pending_with: getPendingWithForStatus(initialStatus),
    next_action_expected: getNextActionExpected(initialStatus),
    is_read_only: false
  };

  const { data, error } = await supabase
    .from('tickets')
    .insert(insertData)
    .select('*')
    .single();

  if (error) throw error;

  if (assignedAgent) {
    await supabase
      .from('users')
      .update({
        current_ticket_count: (assignedAgent.current_ticket_count || 0) + 1,
        last_assigned_at: new Date().toISOString()
      })
      .eq('id', assignedAgent.id);

    await recordAssignmentHistory({
      ticketId: data.id,
      ticketNumber: data.ticket_number,
      fromAgentId: null,
      fromAgentName: null,
      toAgentId: assignedAgent.id,
      toAgentName: assignedAgent.full_name,
      reason: 'Initial auto-assignment based on category mapping and workload',
      assignedBy: user
    });
  }

  await logAudit('ticket', data.id, data.ticket_number, 'created', 'Ticket created', null, insertData, user);

  return data;
}

export async function fetchTickets(filters?: {
  requesterId?: string;
  assignedAgentId?: string;
  status?: TicketStatus | TicketStatus[];
  categoryIds?: string[];
  includeOverdue?: boolean;
}): Promise<Ticket[]> {
  let query = supabase
    .from('tickets')
    .select(`
      *,
      category:ticket_categories(*),
      subcategory:ticket_subcategories(*),
      assigned_agent:users!tickets_assigned_agent_id_fkey(*),
      department:departments(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.requesterId) {
    query = query.eq('requester_id', filters.requesterId);
  }

  if (filters?.assignedAgentId) {
    query = query.eq('assigned_agent_id', filters.assignedAgentId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.categoryIds?.length) {
    query = query.in('category_id', filters.categoryIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  const tickets = data || [];
  for (const ticket of tickets) {
    await checkAndLogSLABreach(ticket);
  }

  return tickets;
}

export async function fetchTicketById(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      category:ticket_categories(*),
      subcategory:ticket_subcategories(*),
      requester:users!tickets_requester_id_fkey(*),
      assigned_agent:users!tickets_assigned_agent_id_fkey(*),
      department:departments(*),
      comments:ticket_comments(*)
    `)
    .eq('id', ticketId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    await checkAndLogSLABreach(data);
  }

  return data;
}

export async function fetchAssignmentHistory(ticketId: string): Promise<TicketAssignmentHistory[]> {
  const { data, error } = await supabase
    .from('ticket_assignment_history')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  user: User,
  options?: {
    closureNotes?: string;
    reopenReason?: string;
  }
): Promise<{ ticket: Ticket; validation: ValidationResult }> {
  const { data: oldTicket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (!oldTicket) {
    throw new Error('Ticket not found');
  }

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('is_internal')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false);

  const hasPublicReply = (comments?.length || 0) > 0;

  const validation = await validateStatusTransition({
    ticket: oldTicket,
    user,
    newStatus: status,
    closureNotes: options?.closureNotes,
    reopenReason: options?.reopenReason,
    hasPublicReply
  });

  if (!validation.valid) {
    throw new TicketWorkflowError(
      'Status transition not allowed',
      validation.errors,
      validation.warnings
    );
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    last_updated_by: user.id,
    last_updated_by_name: user.full_name,
    pending_with: getPendingWithForStatus(status),
    next_action_expected: getNextActionExpected(status)
  };

  if (status === 'acknowledged' && !oldTicket?.acknowledged_at) {
    updateData.acknowledged_at = new Date().toISOString();
    updateData.first_response_at = oldTicket?.first_response_at || new Date().toISOString();
  }

  if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
    if (options?.closureNotes) {
      updateData.closure_notes = options.closureNotes;
    }
  }

  if (status === 'closed') {
    updateData.closed_at = new Date().toISOString();
    updateData.is_read_only = true;
    updateData.pending_with = 'none';
    updateData.next_action_expected = 'Ticket is closed - no action required';
  }

  if (status === 'reopened') {
    updateData.reopened_count = (oldTicket?.reopened_count || 0) + 1;
    updateData.resolved_at = null;
    updateData.closed_at = null;
    updateData.is_read_only = false;
    if (options?.reopenReason) {
      updateData.reopen_reason = options.reopenReason;
    }
  }

  if (status === 'waiting_for_employee') {
    updateData.sla_paused_at = new Date().toISOString();
  } else if (oldTicket?.status === 'waiting_for_employee' && oldTicket?.sla_paused_at) {
    const pausedMinutes = Math.floor(
      (new Date().getTime() - new Date(oldTicket.sla_paused_at).getTime()) / 60000
    );
    updateData.sla_pause_duration_minutes = (oldTicket.sla_pause_duration_minutes || 0) + pausedMinutes;
    updateData.sla_paused_at = null;
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select('*')
    .single();

  if (error) throw error;

  await logAudit(
    'ticket',
    ticketId,
    oldTicket?.ticket_number,
    'status_changed',
    `Status changed from ${oldTicket?.status} to ${status}`,
    { status: oldTicket?.status },
    { status, ...updateData },
    user
  );

  return { ticket: data, validation };
}

export async function assignTicket(
  ticketId: string,
  agentId: string,
  user: User,
  reason?: string
): Promise<{ ticket: Ticket; validation: ValidationResult }> {
  const { data: oldTicket } = await supabase
    .from('tickets')
    .select('*, assigned_agent:users!tickets_assigned_agent_id_fkey(*)')
    .eq('id', ticketId)
    .single();

  if (!oldTicket) {
    throw new Error('Ticket not found');
  }

  const validation = await validateAssignment(oldTicket, agentId, user, reason);

  if (!validation.valid) {
    throw new TicketWorkflowError(
      'Assignment not allowed',
      validation.errors,
      validation.warnings
    );
  }

  if (oldTicket?.assigned_agent_id) {
    await supabase
      .from('users')
      .update({
        current_ticket_count: Math.max(0, (oldTicket.assigned_agent?.current_ticket_count || 1) - 1)
      })
      .eq('id', oldTicket.assigned_agent_id);
  }

  const { data: newAgent } = await supabase
    .from('users')
    .select('*')
    .eq('id', agentId)
    .single();

  const { data, error } = await supabase
    .from('tickets')
    .update({
      assigned_agent_id: agentId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
      last_updated_by: user.id,
      last_updated_by_name: user.full_name,
      pending_with: 'hr_agent',
      next_action_expected: getNextActionExpected('assigned')
    })
    .eq('id', ticketId)
    .select('*')
    .single();

  if (error) throw error;

  await supabase
    .from('users')
    .update({
      current_ticket_count: (newAgent?.current_ticket_count || 0) + 1,
      last_assigned_at: new Date().toISOString()
    })
    .eq('id', agentId);

  await recordAssignmentHistory({
    ticketId,
    ticketNumber: oldTicket.ticket_number,
    fromAgentId: oldTicket.assigned_agent_id,
    fromAgentName: oldTicket.assigned_agent?.full_name || null,
    toAgentId: agentId,
    toAgentName: newAgent?.full_name || null,
    reason: reason || 'No reason provided',
    assignedBy: user
  });

  await logAudit(
    'ticket',
    ticketId,
    oldTicket?.ticket_number,
    'assigned',
    `Ticket assigned to ${newAgent?.full_name}${reason ? ` - Reason: ${reason}` : ''}`,
    { assigned_agent_id: oldTicket?.assigned_agent_id },
    { assigned_agent_id: agentId, assignment_reason: reason },
    user
  );

  return { ticket: data, validation };
}

async function recordAssignmentHistory(params: {
  ticketId: string;
  ticketNumber: string;
  fromAgentId: string | null;
  fromAgentName: string | null;
  toAgentId: string | null;
  toAgentName: string | null;
  reason: string;
  assignedBy: User;
}): Promise<void> {
  await supabase.from('ticket_assignment_history').insert({
    ticket_id: params.ticketId,
    ticket_number: params.ticketNumber,
    from_agent_id: params.fromAgentId,
    from_agent_name: params.fromAgentName,
    to_agent_id: params.toAgentId,
    to_agent_name: params.toAgentName,
    assignment_reason: params.reason,
    assigned_by: params.assignedBy.id,
    assigned_by_name: params.assignedBy.full_name
  });
}

export async function addComment(
  ticketId: string,
  content: string,
  isInternal: boolean,
  user: User
): Promise<TicketComment> {
  const { data: ticket } = await supabase
    .from('tickets')
    .select('is_read_only, status')
    .eq('id', ticketId)
    .single();

  if (ticket?.is_read_only && !user.is_admin) {
    throw new TicketWorkflowError(
      'Cannot add comment to read-only ticket',
      ['This ticket is read-only and cannot receive new comments'],
      []
    );
  }

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      user_name: user.full_name,
      content,
      is_internal: isInternal
    })
    .select('*')
    .single();

  if (error) throw error;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_updated_by: user.id,
    last_updated_by_name: user.full_name
  };

  if (!isInternal) {
    updateData.last_visible_reply_at = new Date().toISOString();
    updateData.last_visible_reply_by = user.full_name;
  }

  await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId);

  return data;
}

export async function rateTicket(
  ticketId: string,
  rating: number,
  comment: string | null,
  user: User
): Promise<void> {
  const { error } = await supabase
    .from('tickets')
    .update({
      employee_rating: rating,
      rating_comment: comment,
      updated_at: new Date().toISOString(),
      last_updated_by: user.id,
      last_updated_by_name: user.full_name
    })
    .eq('id', ticketId)
    .eq('requester_id', user.id);

  if (error) throw error;

  const { data: ticket } = await supabase
    .from('tickets')
    .select('ticket_number')
    .eq('id', ticketId)
    .single();

  await logAudit(
    'ticket',
    ticketId,
    ticket?.ticket_number,
    'rated',
    `Employee rated ticket ${rating}/5`,
    null,
    { employee_rating: rating },
    user
  );
}

export async function updateTicketFields(
  ticketId: string,
  updates: Partial<Ticket>,
  user: User
): Promise<Ticket> {
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const validation = await validateTicketUpdate(ticket, user, updates);

  if (!validation.valid) {
    throw new TicketWorkflowError(
      'Update not allowed',
      validation.errors,
      validation.warnings
    );
  }

  const sanitizedUpdates = { ...updates };
  delete sanitizedUpdates.id;
  delete sanitizedUpdates.ticket_number;
  delete sanitizedUpdates.created_at;
  delete sanitizedUpdates.created_by;

  const { data, error } = await supabase
    .from('tickets')
    .update({
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
      last_updated_by: user.id,
      last_updated_by_name: user.full_name
    })
    .eq('id', ticketId)
    .select('*')
    .single();

  if (error) throw error;

  await logAudit(
    'ticket',
    ticketId,
    ticket.ticket_number,
    'updated',
    'Ticket fields updated',
    ticket,
    { ...sanitizedUpdates },
    user
  );

  return data;
}

async function logAudit(
  entityType: string,
  entityId: string,
  ticketNumber: string | null,
  action: string,
  description: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  user: User
): Promise<void> {
  await supabase.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    ticket_number: ticketNumber,
    action,
    description,
    old_values: oldValues,
    new_values: newValues,
    performed_by: user.id,
    performed_by_name: user.full_name
  });
}
