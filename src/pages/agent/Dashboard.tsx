import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTickets } from '../../services/ticketService';
import { Ticket, TicketStatus, Category } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  TrendingUp,
  Timer,
  Target,
  BarChart3,
  Zap,
  RefreshCw,
  Activity
} from 'lucide-react';
import { formatDistanceToNow, isToday, isPast, differenceInMinutes, startOfWeek, isWithinInterval, startOfMonth } from 'date-fns';

interface AgentStats {
  assigned: number;
  overdue: number;
  dueToday: number;
  resolved: number;
  categoryBreakdown: { category: string; count: number }[];
}

interface ProductivityMetrics {
  avgResponseTime: number | null;
  avgResolutionTime: number | null;
  slaComplianceRate: number;
  acknowledgedOnTime: number;
  resolvedOnTime: number;
  totalAcknowledged: number;
  totalResolved: number;
  weeklyResolved: number;
  monthlyResolved: number;
  ticketsByPriority: { priority: string; count: number }[];
}

export function AgentDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    assigned: 0,
    overdue: 0,
    dueToday: 0,
    resolved: 0,
    categoryBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;

    try {
      const categoryIds = user.mapped_categories?.map((c: Category) => c.id) || [];
      const data = await fetchTickets({
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined
      });

      const myTickets = data.filter(t => t.assigned_agent_id === user.id);
      const openStatuses: TicketStatus[] = ['assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];
      const activeTickets = myTickets.filter(t => openStatuses.includes(t.status));

      const categoryMap = new Map<string, number>();
      activeTickets.forEach(t => {
        const catName = t.category?.name || 'Unknown';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
      });

      const overdueTickets = activeTickets.filter(t => {
        if (t.resolution_due_at && !t.resolved_at && isPast(new Date(t.resolution_due_at))) return true;
        if (t.acknowledgement_due_at && !t.acknowledged_at && isPast(new Date(t.acknowledgement_due_at))) return true;
        return false;
      });

      const dueTodayTickets = activeTickets.filter(t => {
        if (t.resolution_due_at && !t.resolved_at && isToday(new Date(t.resolution_due_at))) return true;
        if (t.acknowledgement_due_at && !t.acknowledged_at && isToday(new Date(t.acknowledgement_due_at))) return true;
        return false;
      });

      setTickets(myTickets);
      setStats({
        assigned: activeTickets.length,
        overdue: overdueTickets.length,
        dueToday: dueTodayTickets.length,
        resolved: myTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        categoryBreakdown: Array.from(categoryMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
      });
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const productivityMetrics = useMemo((): ProductivityMetrics => {
    const myTickets = tickets.filter(t => t.assigned_agent_id === user?.id);

    const acknowledgedTickets = myTickets.filter(t => t.acknowledged_at && t.assigned_at);
    let totalAckTime = 0;
    acknowledgedTickets.forEach(t => {
      const ackTime = differenceInMinutes(new Date(t.acknowledged_at!), new Date(t.assigned_at!));
      totalAckTime += Math.max(0, ackTime);
    });
    const avgResponseTime = acknowledgedTickets.length > 0 ? totalAckTime / acknowledgedTickets.length : null;

    const resolvedTickets = myTickets.filter(t => t.resolved_at && t.created_at);
    let totalResTime = 0;
    resolvedTickets.forEach(t => {
      const resTime = differenceInMinutes(new Date(t.resolved_at!), new Date(t.created_at));
      totalResTime += Math.max(0, resTime);
    });
    const avgResolutionTime = resolvedTickets.length > 0 ? totalResTime / resolvedTickets.length : null;

    const acknowledgedOnTime = myTickets.filter(t =>
      t.acknowledged_at && t.acknowledgement_due_at &&
      new Date(t.acknowledged_at) <= new Date(t.acknowledgement_due_at)
    ).length;
    const totalAcknowledged = acknowledgedTickets.length;

    const resolvedOnTime = myTickets.filter(t =>
      t.resolved_at && t.resolution_due_at &&
      new Date(t.resolved_at) <= new Date(t.resolution_due_at)
    ).length;
    const totalResolved = resolvedTickets.length;

    const totalSlaEligible = totalAcknowledged + totalResolved;
    const totalOnTime = acknowledgedOnTime + resolvedOnTime;
    const slaComplianceRate = totalSlaEligible > 0 ? (totalOnTime / totalSlaEligible) * 100 : 100;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const weeklyResolved = myTickets.filter(t =>
      t.resolved_at && isWithinInterval(new Date(t.resolved_at), { start: weekStart, end: now })
    ).length;

    const monthlyResolved = myTickets.filter(t =>
      t.resolved_at && isWithinInterval(new Date(t.resolved_at), { start: monthStart, end: now })
    ).length;

    const priorityMap = new Map<string, number>();
    const openStatuses: TicketStatus[] = ['assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];
    myTickets.filter(t => openStatuses.includes(t.status)).forEach(t => {
      priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1);
    });
    const ticketsByPriority = ['critical', 'high', 'medium', 'low']
      .map(priority => ({ priority, count: priorityMap.get(priority) || 0 }))
      .filter(p => p.count > 0);

    return {
      avgResponseTime,
      avgResolutionTime,
      slaComplianceRate,
      acknowledgedOnTime,
      resolvedOnTime,
      totalAcknowledged,
      totalResolved,
      weeklyResolved,
      monthlyResolved,
      ticketsByPriority
    };
  }, [tickets, user?.id]);

  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return '--';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getSlaColor = (rate: number): string => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-amber-600';
    return 'text-red-600';
  };

  const getSlaBackground = (rate: number): string => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 85) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const urgentTickets = tickets
    .filter(t => {
      const openStatuses: TicketStatus[] = ['assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];
      return openStatuses.includes(t.status) && t.assigned_agent_id === user?.id;
    })
    .sort((a, b) => {
      const aDue = a.resolution_due_at ? new Date(a.resolution_due_at).getTime() : Infinity;
      const bDue = b.resolution_due_at ? new Date(b.resolution_due_at).getTime() : Infinity;
      return aDue - bDue;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.full_name?.split(' ')[0]}`}
        subtitle="Here's your ticket workload overview"
        actions={
          <button
            onClick={loadTickets}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/agent/queue"
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.assigned}</p>
              <p className="text-sm text-gray-500">Active Tickets</p>
            </div>
          </div>
        </Link>

        <Link
          to="/agent/queue?preset=overdue"
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.overdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.overdue}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </Link>

        <Link
          to="/agent/queue?preset=due_today"
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.dueToday > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Clock className={`w-6 h-6 ${stats.dueToday > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${stats.dueToday > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{stats.dueToday}</p>
              <p className="text-sm text-gray-500">Due Today</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-slate-300" />
          <h2 className="font-semibold">My Performance</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Timer className="w-3.5 h-3.5" />
              Avg Response Time
            </div>
            <p className="text-2xl font-bold">{formatMinutes(productivityMetrics.avgResponseTime)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Time to acknowledge</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Zap className="w-3.5 h-3.5" />
              Avg Resolution Time
            </div>
            <p className="text-2xl font-bold">{formatMinutes(productivityMetrics.avgResolutionTime)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Time to resolve</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Target className="w-3.5 h-3.5" />
              SLA Compliance
            </div>
            <p className={`text-2xl font-bold ${getSlaColor(productivityMetrics.slaComplianceRate)}`}>
              {productivityMetrics.slaComplianceRate.toFixed(1)}%
            </p>
            <div className="mt-1.5 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getSlaBackground(productivityMetrics.slaComplianceRate)}`}
                style={{ width: `${Math.min(100, productivityMetrics.slaComplianceRate)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Resolved This Week
            </div>
            <p className="text-2xl font-bold">{productivityMetrics.weeklyResolved}</p>
            <p className="text-xs text-slate-400 mt-0.5">{productivityMetrics.monthlyResolved} this month</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Ack On-Time
            </div>
            <p className="text-2xl font-bold">
              {productivityMetrics.totalAcknowledged > 0
                ? `${productivityMetrics.acknowledgedOnTime}/${productivityMetrics.totalAcknowledged}`
                : '--'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Acknowledgements</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Resolved On-Time
            </div>
            <p className="text-2xl font-bold">
              {productivityMetrics.totalResolved > 0
                ? `${productivityMetrics.resolvedOnTime}/${productivityMetrics.totalResolved}`
                : '--'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Resolutions</p>
          </div>
        </div>
      </div>

      {productivityMetrics.ticketsByPriority.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Active Tickets by Priority</h3>
          <div className="flex items-center gap-4">
            {productivityMetrics.ticketsByPriority.map(({ priority, count }) => {
              const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
                critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
                high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
                medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medium' },
                low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Low' }
              };
              const config = priorityConfig[priority] || priorityConfig.medium;
              return (
                <div key={priority} className={`px-4 py-2 rounded-lg ${config.bg}`}>
                  <p className={`text-xl font-bold ${config.text}`}>{count}</p>
                  <p className="text-xs text-gray-600">{config.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Urgent Tickets</h2>
            <Link
              to="/agent/queue"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {urgentTickets.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No urgent tickets</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {urgentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/agent/ticket/${ticket.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-600">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} size="sm" />
                        <PriorityBadge priority={ticket.priority} size="sm" />
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {ticket.requester_name} • {ticket.category?.name}
                      </p>
                    </div>
                    <SLAIndicator
                      dueAt={ticket.resolution_due_at}
                      completedAt={ticket.resolved_at}
                      isBreached={ticket.is_resolution_breached}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              By Category
            </h2>
          </div>
          {stats.categoryBreakdown.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No data</div>
          ) : (
            <div className="p-6 space-y-4">
              {stats.categoryBreakdown.map(({ category, count }) => (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{category}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (count / stats.assigned) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}