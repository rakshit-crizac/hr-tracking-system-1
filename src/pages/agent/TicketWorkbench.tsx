import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchTicketById,
  updateTicketStatus,
  addComment,
  assignTicket,
  fetchEligibleAgents,
  fetchAssignmentHistory,
  TicketWorkflowError
} from '../../services/ticketService';
import { getAllowedTransitions } from '../../services/workflowValidationService';
import { supabase } from '../../lib/supabase';
import { Ticket, User, TicketStatus, TicketAssignmentHistory } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import {
  ArrowLeft,
  Loader2,
  Clock,
  User as UserIcon,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  Play,
  UserPlus,
  Eye,
  Shield,
  AlertTriangle,
  FileText,
  Lock,
  Headphones,
  ArrowUp,
  MessageCircle,
  RefreshCw,
  X,
  History,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';

interface QuickAction {
  key: string;
  label: string;
  icon: typeof Eye;
  color: string;
  description: string;
  targetStatus?: TicketStatus;
  requiresNote?: boolean;
  requiresPublicReply?: boolean;
}

const quickActions: QuickAction[] = [
  {
    key: 'acknowledge',
    label: 'Acknowledge',
    icon: Eye,
    color: 'bg-teal-600 hover:bg-teal-700',
    description: 'Confirm you have seen this ticket',
    targetStatus: 'acknowledged'
  },
  {
    key: 'start_work',
    label: 'Start Working',
    icon: Play,
    color: 'bg-blue-600 hover:bg-blue-700',
    description: 'Begin actively working on this ticket',
    targetStatus: 'in_progress'
  },
  {
    key: 'ask_info',
    label: 'Ask for Info',
    icon: MessageCircle,
    color: 'bg-amber-600 hover:bg-amber-700',
    description: 'Request additional information from employee',
    targetStatus: 'waiting_for_employee',
    requiresNote: true,
    requiresPublicReply: true
  },
  {
    key: 'escalate',
    label: 'Escalate',
    icon: ArrowUp,
    color: 'bg-rose-600 hover:bg-rose-700',
    description: 'Escalate to a senior agent',
    targetStatus: 'escalated',
    requiresNote: true
  },
  {
    key: 'resolve',
    label: 'Resolve',
    icon: CheckCircle,
    color: 'bg-green-600 hover:bg-green-700',
    description: 'Mark ticket as resolved',
    targetStatus: 'resolved',
    requiresNote: true
  }
];

const resolutionTemplates = [
  { label: 'Information Provided', text: 'The requested information has been provided to the employee. No further action required.' },
  { label: 'Issue Fixed', text: 'The reported issue has been investigated and corrected. The fix has been verified.' },
  { label: 'Request Completed', text: 'The employee\'s request has been successfully processed and completed.' },
  { label: 'Policy Clarified', text: 'The relevant policy has been explained to the employee and their questions addressed.' },
  { label: 'Referred to Department', text: 'This matter has been referred to the appropriate department for handling.' },
];

export function TicketWorkbench() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [eligibleAgents, setEligibleAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [breachReason, setBreachReason] = useState('');
  const [showBreachCapture, setShowBreachCapture] = useState(false);
  const [workflowError, setWorkflowError] = useState<string[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<TicketAssignmentHistory[]>([]);
  const [showAssignmentHistory, setShowAssignmentHistory] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    if (!id) return;
    try {
      const data = await fetchTicketById(id);
      setTicket(data);

      if (data) {
        const agents = await fetchEligibleAgents(data.category_id, data.is_sensitive);
        setEligibleAgents(agents);

        const history = await fetchAssignmentHistory(id);
        setAssignmentHistory(history);

        if ((data.is_resolution_breached || data.is_acknowledgement_breached) && !data.breach_reason) {
          setShowBreachCapture(true);
        }
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus, options?: { closureNotes?: string; reopenReason?: string }) => {
    if (!user || !ticket) return;

    setWorkflowError([]);
    setUpdatingStatus(true);
    try {
      const result = await updateTicketStatus(ticket.id, newStatus, user, options);
      if (result.validation.warnings.length > 0) {
        console.warn('Workflow warnings:', result.validation.warnings);
      }
      await loadTicket();
      setClosureNotes('');
      setActiveQuickAction(null);
      setActionNote('');
    } catch (error) {
      if (error instanceof TicketWorkflowError) {
        setWorkflowError(error.errors);
      } else {
        console.error('Failed to update status:', error);
        setWorkflowError(['An unexpected error occurred']);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setWorkflowError([]);

    if (action.requiresNote || action.requiresPublicReply) {
      setActiveQuickAction(action);
      return;
    }

    if (action.targetStatus) {
      await handleStatusChange(action.targetStatus);
    }
  };

  const handleConfirmQuickAction = async () => {
    if (!activeQuickAction?.targetStatus || !user || !ticket) return;

    if (activeQuickAction.key === 'ask_info') {
      if (!actionNote.trim()) {
        setWorkflowError(['Please provide the information you need from the employee']);
        return;
      }
      await addComment(ticket.id, actionNote, false, user);
    } else if (activeQuickAction.key === 'escalate' && actionNote.trim()) {
      await addComment(ticket.id, `Escalation reason: ${actionNote}`, true, user);
    }

    const options = activeQuickAction.key === 'resolve' ? { closureNotes } : undefined;
    await handleStatusChange(activeQuickAction.targetStatus, options);
  };

  const handleAddComment = async () => {
    if (!user || !ticket || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(ticket.id, newComment, isInternalNote, user);
      setNewComment('');
      await loadTicket();
    } catch (error) {
      if (error instanceof TicketWorkflowError) {
        setWorkflowError(error.errors);
      } else {
        console.error('Failed to add comment:', error);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReassign = async () => {
    if (!user || !ticket || !selectedAgentId) return;

    if (ticket.assigned_agent_id && !reassignReason.trim()) {
      setWorkflowError(['A reason is required when reassigning a ticket']);
      return;
    }

    setWorkflowError([]);
    setReassigning(true);
    try {
      await assignTicket(ticket.id, selectedAgentId, user, reassignReason || undefined);
      setShowReassign(false);
      setSelectedAgentId('');
      setReassignReason('');
      await loadTicket();
    } catch (error) {
      if (error instanceof TicketWorkflowError) {
        setWorkflowError(error.errors);
      } else {
        console.error('Failed to reassign:', error);
        setWorkflowError(['Failed to reassign ticket']);
      }
    } finally {
      setReassigning(false);
    }
  };

  const handleSaveBreachReason = async () => {
    if (!ticket || !breachReason.trim()) return;

    try {
      await supabase
        .from('tickets')
        .update({ breach_reason: breachReason })
        .eq('id', ticket.id);

      setShowBreachCapture(false);
      await loadTicket();
    } catch (error) {
      console.error('Failed to save breach reason:', error);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const availableActions = useMemo(() => {
    if (!ticket) return [];

    const transitions = getAllowedTransitions(ticket.status);
    return quickActions.filter(action =>
      action.targetStatus && transitions.includes(action.targetStatus)
    );
  }, [ticket]);

  const slaMetrics = useMemo(() => {
    if (!ticket) return null;

    let ackTimeMinutes: number | null = null;
    let resTimeMinutes: number | null = null;

    if (ticket.acknowledged_at) {
      ackTimeMinutes = differenceInMinutes(new Date(ticket.acknowledged_at), new Date(ticket.created_at));
    }

    if (ticket.resolved_at && ticket.acknowledged_at) {
      resTimeMinutes = differenceInMinutes(new Date(ticket.resolved_at), new Date(ticket.acknowledged_at));
    }

    return {
      ackTimeMinutes,
      resTimeMinutes,
      formattedAckTime: ackTimeMinutes ? formatDuration(ackTimeMinutes) : null,
      formattedResTime: resTimeMinutes ? formatDuration(resTimeMinutes) : null,
    };
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Ticket not found</p>
        <button
          onClick={() => navigate('/agent/queue')}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to queue
        </button>
      </div>
    );
  }

  const allComments = ticket.comments || [];
  const publicComments = allComments.filter(c => !c.is_internal);
  const internalNotes = allComments.filter(c => c.is_internal);
  const isBreached = ticket.is_resolution_breached || ticket.is_acknowledgement_breached;
  const isReadOnly = ticket.is_read_only && !user?.is_admin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/agent/queue')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </button>
        <button
          onClick={loadTicket}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {workflowError.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Action Not Allowed</h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {workflowError.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setWorkflowError([])} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="bg-gray-100 border border-gray-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-800">Read-Only Ticket</h4>
              <p className="text-sm text-gray-600">This ticket is closed and cannot be modified.</p>
            </div>
          </div>
        </div>
      )}

      {isBreached && showBreachCapture && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">SLA Breach - Reason Required</h3>
              <p className="text-sm text-red-700 mt-1 mb-3">
                This ticket has breached its SLA. Please provide a reason for the breach.
              </p>
              <textarea
                value={breachReason}
                onChange={(e) => setBreachReason(e.target.value)}
                placeholder="Explain why the SLA was breached..."
                rows={2}
                className="w-full px-4 py-2 border border-red-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-white"
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleSaveBreachReason}
                  disabled={!breachReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Save Reason
                </button>
                <button
                  onClick={() => setShowBreachCapture(false)}
                  className="px-4 py-2 text-red-700 hover:bg-red-100 rounded-lg"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={`px-6 py-4 border-b ${isBreached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-blue-600">{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.is_sensitive && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Sensitive
                </span>
              )}
              {isBreached && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  SLA Breached
                </span>
              )}
              {ticket.is_read_only && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  <Lock className="w-3 h-3" />
                  Read-Only
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!ticket.acknowledged_at && (
                <SLAIndicator
                  dueAt={ticket.acknowledgement_due_at}
                  completedAt={ticket.acknowledged_at}
                  isBreached={ticket.is_acknowledgement_breached}
                  label="Ack"
                />
              )}
              <SLAIndicator
                dueAt={ticket.resolution_due_at}
                completedAt={ticket.resolved_at}
                isBreached={ticket.is_resolution_breached}
                pausedAt={ticket.sla_paused_at}
                label="Res"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{ticket.title}</h1>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-gray-500 block mb-1">Requester</span>
              <span className="font-medium text-gray-900">{ticket.requester_name}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Department</span>
              <span className="font-medium text-gray-900">{ticket.department?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Category</span>
              <span className="font-medium text-gray-900">{ticket.category?.name}</span>
              {ticket.subcategory && (
                <span className="text-xs text-gray-500 block">{ticket.subcategory.name}</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Assigned To</span>
              <span className="font-medium text-gray-900">
                {ticket.assigned_agent?.full_name || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Pending With</span>
              <span className={`font-medium capitalize ${
                ticket.pending_with === 'employee' ? 'text-amber-600' :
                ticket.pending_with === 'hr_agent' ? 'text-blue-600' :
                ticket.pending_with === 'internal' ? 'text-purple-600' : 'text-gray-600'
              }`}>
                {ticket.pending_with?.replace('_', ' ') || 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Last Update</span>
              <span className="font-medium text-gray-900">
                {ticket.last_updated_by_name || 'N/A'}
              </span>
              <span className="text-xs text-gray-500 block">
                {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {ticket.next_action_expected && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Next Action:</span> {ticket.next_action_expected}
              </p>
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && availableActions.length > 0 && !activeQuickAction && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {availableActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action)}
                  disabled={updatingStatus}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg text-white transition-colors disabled:opacity-50 ${action.color}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowReassign(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="w-6 h-6" />
              <span className="text-sm font-medium">Reassign</span>
            </button>
          </div>
        </div>
      )}

      {activeQuickAction && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{activeQuickAction.label}</h3>
            <button
              onClick={() => { setActiveQuickAction(null); setActionNote(''); setClosureNotes(''); setWorkflowError([]); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {activeQuickAction.key === 'resolve' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Summary <span className="text-red-500">*</span>
                </label>
                <div className="mb-3">
                  <span className="text-xs text-gray-500">Quick templates:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {resolutionTemplates.map((template) => (
                      <button
                        key={template.label}
                        onClick={() => setClosureNotes(template.text)}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmQuickAction}
                  disabled={!closureNotes.trim() || updatingStatus}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? 'Resolving...' : 'Resolve Ticket'}
                </button>
                <button
                  onClick={() => { setActiveQuickAction(null); setClosureNotes(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeQuickAction.key === 'ask_info' ? 'What information do you need?' :
                   activeQuickAction.key === 'escalate' ? 'Reason for escalation' : 'Note'}
                  <span className="text-red-500"> *</span>
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    activeQuickAction.key === 'ask_info'
                      ? 'Please provide the following information...'
                      : activeQuickAction.key === 'escalate'
                      ? 'This ticket needs escalation because...'
                      : 'Add a note...'
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              {activeQuickAction.key === 'ask_info' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                  This message will be sent to the employee and the SLA timer will be paused until they respond.
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmQuickAction}
                  disabled={!actionNote.trim() || updatingStatus}
                  className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${activeQuickAction.color}`}
                >
                  {updatingStatus ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setActiveQuickAction(null); setActionNote(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showReassign && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Reassign Ticket</h3>
            <button
              onClick={() => { setShowReassign(false); setSelectedAgentId(''); setReassignReason(''); setWorkflowError([]); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an agent</option>
                {eligibleAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.current_ticket_count} active tickets)
                  </option>
                ))}
              </select>
            </div>
            {ticket.assigned_agent_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reassignment Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Why is this ticket being reassigned?"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleReassign}
                disabled={!selectedAgentId || (ticket.assigned_agent_id && !reassignReason.trim()) || reassigning}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
              <button
                onClick={() => { setShowReassign(false); setSelectedAgentId(''); setReassignReason(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Employee Conversation
            </h3>
            <div className="flex items-center gap-2">
              {ticket.last_visible_reply_at && (
                <span className="text-xs text-gray-500">
                  Last reply: {ticket.last_visible_reply_by}
                </span>
              )}
              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">{publicComments.length}</span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {publicComments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {publicComments.map((comment) => {
                  const isEmployee = comment.user_id === ticket.requester_id;
                  return (
                    <div key={comment.id} className={`p-4 ${isEmployee ? 'bg-gray-50' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isEmployee ? 'bg-gray-200' : 'bg-blue-100'
                        }`}>
                          {isEmployee ? (
                            <UserIcon className="w-3 h-3 text-gray-600" />
                          ) : (
                            <Headphones className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{comment.user_name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{comment.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <textarea
                  value={!isInternalNote ? newComment : ''}
                  onChange={(e) => { setIsInternalNote(false); setNewComment(e.target.value); }}
                  placeholder="Reply to employee..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={() => { setIsInternalNote(false); handleAddComment(); }}
                  disabled={isInternalNote || !newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-amber-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Internal Notes
            </h3>
            <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Not visible to employee</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {internalNotes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No internal notes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {internalNotes.map((comment) => (
                  <div key={comment.id} className="p-4 bg-amber-50/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{comment.user_name}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="p-4 border-t border-gray-200 bg-amber-50/50">
              <div className="flex gap-2">
                <textarea
                  value={isInternalNote ? newComment : ''}
                  onChange={(e) => { setIsInternalNote(true); setNewComment(e.target.value); }}
                  placeholder="Add internal note..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
                />
                <button
                  onClick={() => { setIsInternalNote(true); handleAddComment(); }}
                  disabled={!isInternalNote || !newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            SLA Metrics
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Acknowledgement</span>
                <SLAIndicator
                  dueAt={ticket.acknowledgement_due_at}
                  completedAt={ticket.acknowledged_at}
                  isBreached={ticket.is_acknowledgement_breached}
                />
              </div>
              {slaMetrics?.formattedAckTime && (
                <p className="text-xs text-gray-500">Response time: {slaMetrics.formattedAckTime}</p>
              )}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Resolution</span>
                <SLAIndicator
                  dueAt={ticket.resolution_due_at}
                  completedAt={ticket.resolved_at}
                  isBreached={ticket.is_resolution_breached}
                  pausedAt={ticket.sla_paused_at}
                />
              </div>
              {slaMetrics?.formattedResTime && (
                <p className="text-xs text-gray-500">Resolution time: {slaMetrics.formattedResTime}</p>
              )}
              {ticket.sla_paused_at && (
                <p className="text-xs text-amber-600 mt-1">Timer paused - waiting for employee</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Assignment History
            </h3>
            {assignmentHistory.length > 2 && (
              <button
                onClick={() => setShowAssignmentHistory(!showAssignmentHistory)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showAssignmentHistory ? 'Show Less' : `Show All (${assignmentHistory.length})`}
              </button>
            )}
          </div>
          {assignmentHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No assignment history</p>
          ) : (
            <div className="space-y-3">
              {(showAssignmentHistory ? assignmentHistory : assignmentHistory.slice(0, 2)).map((history) => (
                <div key={history.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-gray-900">
                    {history.from_agent_name ? (
                      <>
                        <UserCheck className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{history.from_agent_name}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{history.to_agent_name}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{history.to_agent_name}</span>
                        <span className="text-gray-500">(Initial)</span>
                      </>
                    )}
                  </div>
                  {history.assignment_reason && (
                    <p className="text-xs text-gray-500 mt-1">{history.assignment_reason}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    By {history.assigned_by_name} - {format(new Date(history.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ticket Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Times Reopened</span>
                <span className="font-medium text-gray-900">{ticket.reopened_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Source</span>
                <span className="font-medium text-gray-900 capitalize">{ticket.source}</span>
              </div>
              {ticket.employee_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Employee Rating</span>
                  <span className="font-medium text-gray-900">{ticket.employee_rating}/5</span>
                </div>
              )}
            </div>
          </div>

          {ticket.reopen_reason && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reopen Reason
              </h4>
              <p className="text-sm text-amber-700">{ticket.reopen_reason}</p>
            </div>
          )}

          {ticket.closure_notes && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resolution Notes
              </h4>
              <p className="text-sm text-green-700">{ticket.closure_notes}</p>
            </div>
          )}

          {ticket.breach_reason && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Breach Reason
              </h4>
              <p className="text-sm text-red-700">{ticket.breach_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
