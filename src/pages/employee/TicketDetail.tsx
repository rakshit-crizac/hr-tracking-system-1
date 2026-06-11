import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTicketById, addComment, rateTicket, updateTicketStatus } from '../../services/ticketService';
import { Ticket, TicketStatus, TicketComment } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import { formatSLATime } from '../../services/slaService';
import {
  ArrowLeft,
  Loader2,
  Clock,
  User,
  Building2,
  MessageSquare,
  Send,
  Star,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  Shield,
  Calendar,
  ArrowUpRight,
  FileText,
  Headphones
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

const statusExplanations: Record<TicketStatus, { title: string; description: string; nextStep: string }> = {
  open: {
    title: 'Waiting for Assignment',
    description: 'Your request has been received and is waiting to be assigned to an HR representative.',
    nextStep: 'An HR agent will be assigned shortly.'
  },
  assigned: {
    title: 'Assigned to HR',
    description: 'Your request has been assigned to an HR representative who will review it soon.',
    nextStep: 'You will receive an acknowledgement once they start working on it.'
  },
  acknowledged: {
    title: 'Being Reviewed',
    description: 'An HR representative has seen your request and is actively reviewing it.',
    nextStep: 'They may reach out if they need more information.'
  },
  in_progress: {
    title: 'In Progress',
    description: 'Your request is being actively worked on by the HR team.',
    nextStep: 'You will be notified when there are updates or when it is resolved.'
  },
  waiting_for_employee: {
    title: 'Action Required',
    description: 'The HR team needs additional information from you to proceed.',
    nextStep: 'Please respond to the latest comment to help resolve your request faster.'
  },
  waiting_for_internal_review: {
    title: 'Under Review',
    description: 'Your request is being reviewed internally by the HR team.',
    nextStep: 'This may involve coordination with other departments.'
  },
  resolved: {
    title: 'Resolved',
    description: 'The HR team has resolved your request.',
    nextStep: 'Please review the resolution. You can reopen if the issue persists.'
  },
  closed: {
    title: 'Closed',
    description: 'This ticket has been closed and archived.',
    nextStep: 'If you have a new issue, please create a new ticket.'
  },
  reopened: {
    title: 'Reopened',
    description: 'Your ticket has been reopened for further attention.',
    nextStep: 'The HR team will review and address your concerns.'
  },
  escalated: {
    title: 'Escalated',
    description: 'Your request has been escalated for priority handling.',
    nextStep: 'A senior HR representative is now handling your request.'
  }
};

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    if (!id) return;
    try {
      const data = await fetchTicketById(id);
      setTicket(data);
      if (data?.status === 'resolved' && !data.employee_rating) {
        setShowRating(true);
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !ticket || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(ticket.id, newComment, false, user);
      setNewComment('');
      await loadTicket();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRate = async () => {
    if (!user || !ticket || rating === 0) return;

    setSubmittingRating(true);
    try {
      await rateTicket(ticket.id, rating, ratingComment || null, user);
      setShowRating(false);
      await loadTicket();
    } catch (error) {
      console.error('Failed to rate ticket:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleReopen = async () => {
    if (!user || !ticket) return;

    setReopening(true);
    try {
      await updateTicketStatus(ticket.id, 'reopened', user);
      await loadTicket();
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    } finally {
      setReopening(false);
    }
  };

  const canReopen = (ticket: Ticket): boolean => {
    if (ticket.status !== 'resolved') return false;
    if (ticket.reopened_count >= 3) return false;
    if (!ticket.resolved_at) return false;
    const hoursSinceResolution = differenceInHours(new Date(), new Date(ticket.resolved_at));
    return hoursSinceResolution <= 48;
  };

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
          onClick={() => navigate('/tickets')}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to tickets
        </button>
      </div>
    );
  }

  const publicComments = ticket.comments?.filter((c) => !c.is_internal) || [];
  const isWaitingForMe = ticket.status === 'waiting_for_employee';
  const statusInfo = statusExplanations[ticket.status];
  const reopenable = canReopen(ticket);

  const getSLAFriendlyText = (dueAt: string | null, isBreached: boolean, completedAt: string | null): string => {
    if (completedAt) return 'Completed on time';
    if (isBreached) return 'Response time exceeded';
    if (!dueAt) return 'No deadline set';

    const now = new Date();
    const due = new Date(dueAt);
    const hoursRemaining = differenceInHours(due, now);

    if (hoursRemaining <= 0) return 'Response expected very soon';
    if (hoursRemaining <= 2) return 'Response expected within 2 hours';
    if (hoursRemaining <= 8) return 'Response expected today';
    if (hoursRemaining <= 24) return 'Response expected within 24 hours';
    return `Response expected within ${Math.ceil(hoursRemaining / 24)} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Tickets
        </button>
        <button
          onClick={loadTicket}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {isWaitingForMe && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">Your Response is Needed</h3>
            <p className="text-sm text-amber-700 mt-1">
              The HR team is waiting for additional information from you. Please scroll down to view
              their message and respond to help resolve your request faster.
            </p>
            <button
              onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
            >
              View and respond
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-blue-600">{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.is_sensitive && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Confidential
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              Created {format(new Date(ticket.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{ticket.title}</h1>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>{ticket.category?.name}</span>
              {ticket.subcategory && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <span>{ticket.subcategory.name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-xl border p-5 ${
            statusInfo.title === 'Action Required'
              ? 'bg-amber-50 border-amber-200'
              : statusInfo.title === 'Resolved'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              statusInfo.title === 'Action Required'
                ? 'text-amber-800'
                : statusInfo.title === 'Resolved'
                ? 'text-green-800'
                : 'text-blue-800'
            }`}>
              {statusInfo.title}
            </h3>
            <p className={`text-sm mb-3 ${
              statusInfo.title === 'Action Required'
                ? 'text-amber-700'
                : statusInfo.title === 'Resolved'
                ? 'text-green-700'
                : 'text-blue-700'
            }`}>
              {statusInfo.description}
            </p>
            <div className={`text-sm font-medium inline-flex items-center gap-1 ${
              statusInfo.title === 'Action Required'
                ? 'text-amber-800'
                : statusInfo.title === 'Resolved'
                ? 'text-green-800'
                : 'text-blue-800'
            }`}>
              <ArrowUpRight className="w-4 h-4" />
              {statusInfo.nextStep}
            </div>
          </div>

          {showRating && ticket.status === 'resolved' && !ticket.employee_rating && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">How was your experience?</h3>
              <p className="text-sm text-gray-500 mb-4">Your feedback helps us improve our service</p>
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    <Star className="w-10 h-10 fill-current" />
                  </button>
                ))}
              </div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share additional feedback (optional)..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleRate}
                  disabled={rating === 0 || submittingRating}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
                <button
                  onClick={() => setShowRating(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          <div id="comments-section" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                Conversation
              </h3>
              <span className="text-sm text-gray-500">{publicComments.length} message{publicComments.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="p-6 bg-blue-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{ticket.requester_name}</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">You</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>
              </div>

              {publicComments.map((comment) => {
                const isEmployee = comment.user_id === ticket.requester_id;
                return (
                  <div key={comment.id} className={`p-6 ${isEmployee ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isEmployee ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {isEmployee ? (
                          <User className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Headphones className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{comment.user_name}</span>
                          {isEmployee ? (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">You</span>
                          ) : (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">HR Team</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {publicComments.length === 0 && (
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No replies yet</p>
                  <p className="text-sm text-gray-400">The HR team will respond soon</p>
                </div>
              )}
            </div>

            {ticket.status !== 'closed' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {isWaitingForMe && (
                  <div className="mb-4 p-3 bg-amber-100 rounded-lg text-sm text-amber-800">
                    <strong>Reminder:</strong> The HR team is waiting for your response. Please provide the requested information below.
                  </div>
                )}
                <div className="flex gap-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      isWaitingForMe
                        ? 'Type your response here...'
                        : 'Add a message to the HR team...'
                    }
                    rows={3}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Response Times
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Acknowledgement</span>
                  <SLAIndicator
                    dueAt={ticket.acknowledgement_due_at}
                    completedAt={ticket.acknowledged_at}
                    isBreached={ticket.is_acknowledgement_breached}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {getSLAFriendlyText(ticket.acknowledgement_due_at, ticket.is_acknowledgement_breached, ticket.acknowledged_at)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Resolution</span>
                  <SLAIndicator
                    dueAt={ticket.resolution_due_at}
                    completedAt={ticket.resolved_at}
                    isBreached={ticket.is_resolution_breached}
                    pausedAt={ticket.sla_paused_at}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {ticket.sla_paused_at
                    ? 'Timer paused while waiting for your response'
                    : getSLAFriendlyText(ticket.resolution_due_at, ticket.is_resolution_breached, ticket.resolved_at)
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-gray-400" />
              Your HR Contact
            </h3>
            {ticket.assigned_agent ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{ticket.assigned_agent.full_name}</p>
                  <p className="text-sm text-gray-500">HR Representative</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-600">Pending Assignment</p>
                  <p className="text-sm text-gray-400">Will be assigned shortly</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ticket Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Ticket ID</span>
                <span className="font-medium text-gray-900">{ticket.ticket_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Department</span>
                <span className="font-medium text-gray-900">{ticket.department?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                </span>
              </div>
              {ticket.reopened_count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Times Reopened</span>
                  <span className="font-medium text-gray-900">{ticket.reopened_count}</span>
                </div>
              )}
            </div>
          </div>

          {ticket.employee_rating && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your Rating</h3>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      ticket.employee_rating! >= star
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm text-gray-500 ml-2">{ticket.employee_rating}/5</span>
              </div>
              {ticket.rating_comment && (
                <p className="text-sm text-gray-600 italic">"{ticket.rating_comment}"</p>
              )}
            </div>
          )}

          {reopenable && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h4 className="font-medium text-gray-800 mb-2">Issue not resolved?</h4>
              <p className="text-sm text-gray-600 mb-3">
                If the issue persists or you need further assistance, you can reopen this ticket.
              </p>
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                {reopening ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Reopen Ticket
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {3 - ticket.reopened_count} reopen{3 - ticket.reopened_count !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}

          {ticket.closure_notes && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Resolution Summary
              </h3>
              <p className="text-sm text-green-700 whitespace-pre-wrap">{ticket.closure_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
