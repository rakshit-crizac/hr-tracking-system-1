import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTickets } from '../../services/ticketService';
import { Ticket, TicketStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Loader2,
  MessageSquare,
  Inbox,
  HelpCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface DashboardStats {
  total: number;
  open: number;
  resolved: number;
  breached: number;
  waitingOnYou: number;
}

export function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, open: 0, resolved: 0, breached: 0, waitingOnYou: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    try {
      const data = await fetchTickets({ requesterId: user.id });
      setTickets(data);

      const openStatuses: TicketStatus[] = ['open', 'assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];
      const resolvedStatuses: TicketStatus[] = ['resolved', 'closed'];

      setStats({
        total: data.length,
        open: data.filter(t => openStatuses.includes(t.status)).length,
        resolved: data.filter(t => resolvedStatuses.includes(t.status)).length,
        breached: data.filter(t => t.is_acknowledgement_breached || t.is_resolution_breached).length,
        waitingOnYou: data.filter(t => t.status === 'waiting_for_employee' || t.status === 'resolved').length,
      });
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentTickets = tickets.slice(0, 5);
  const ticketsNeedingAction = tickets.filter(t => t.status === 'waiting_for_employee' || t.status === 'resolved');
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ')[0]}`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        actions={
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Raise New Ticket
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Tickets"
          value={stats.total}
          icon={TicketIcon}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          href="/tickets"
        />
        <StatCard
          title="Open"
          value={stats.open}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
          href="/tickets?status=open"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
          href="/tickets?status=resolved"
        />
        <StatCard
          title="Need Your Response"
          value={stats.waitingOnYou}
          icon={MessageSquare}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-50"
          href="/tickets?status=waiting"
        />
        <StatCard
          title="SLA Breached"
          value={stats.breached}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-50"
        />
      </div>

      {ticketsNeedingAction.length > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-teal-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-teal-900">Action Required</h3>
              <p className="text-sm text-teal-700 mt-1">
                You have {ticketsNeedingAction.length} ticket{ticketsNeedingAction.length > 1 ? 's' : ''} waiting for your response or confirmation.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {ticketsNeedingAction.slice(0, 3).map(ticket => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-50 border border-teal-200 transition-colors"
                  >
                    {ticket.ticket_number}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
            <Link
              to="/tickets"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No tickets yet"
              description="When you raise HR tickets, they'll appear here for easy tracking."
              action={{
                label: 'Raise Your First Ticket',
                onClick: () => navigate('/tickets/new')
              }}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-blue-600">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} size="sm" />
                        <PriorityBadge priority={ticket.priority} size="sm" />
                        {(ticket.is_acknowledgement_breached || ticket.is_resolution_breached) && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            SLA
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                        <span>{ticket.category?.name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/tickets/new"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Raise New Ticket</p>
                  <p className="text-sm text-gray-500">Create a new HR request</p>
                </div>
              </Link>
              <Link
                to="/tickets"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                  <TicketIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">My Tickets</p>
                  <p className="text-sm text-gray-500">View all your tickets</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Need Help?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Our HR team typically responds within 24 hours. For urgent matters, please mark your ticket as high or critical priority.
            </p>
            <div className="text-sm text-gray-500">
              <p>Business Hours: Mon-Fri, 9 AM - 6 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
