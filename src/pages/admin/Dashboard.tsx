import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  Users,
  FolderKanban,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Plus,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, isWithinInterval } from 'date-fns';

interface AdminStats {
  totalOpenTickets: number;
  overdueTickets: number;
  ticketsDueToday: number;
  slaComplianceWeek: number;
  ticketsThisMonth: number;
  reopenedTickets: number;
  totalUsers: number;
  totalHRAgents: number;
  totalCategories: number;
  avgResolutionHours: number;
}

interface CategoryStat {
  name: string;
  count: number;
}

interface StatusStat {
  name: string;
  value: number;
}

interface TrendData {
  week: string;
  tickets: number;
  resolved: number;
}

interface SLATrendData {
  date: string;
  compliance: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
const STATUS_COLORS: Record<string, string> = {
  'Open': '#3b82f6',
  'Assigned': '#8b5cf6',
  'In Progress': '#f59e0b',
  'Waiting': '#6b7280',
  'Resolved': '#10b981',
  'Closed': '#374151',
  'Escalated': '#ef4444'
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalOpenTickets: 0,
    overdueTickets: 0,
    ticketsDueToday: 0,
    slaComplianceWeek: 100,
    ticketsThisMonth: 0,
    reopenedTickets: 0,
    totalUsers: 0,
    totalHRAgents: 0,
    totalCategories: 0,
    avgResolutionHours: 0
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [statusStats, setStatusStats] = useState<StatusStat[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [slaTrendData, setSlaTrendData] = useState<SLATrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [ticketsRes, usersRes, categoriesRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('users').select('*'),
        supabase.from('ticket_categories').select('*').eq('is_active', true)
      ]);

      const tickets = ticketsRes.data || [];
      const users = usersRes.data || [];
      const categories = categoriesRes.data || [];

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const openStatuses = ['open', 'assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];

      const openTickets = tickets.filter(t => openStatuses.includes(t.status));
      const overdueTickets = openTickets.filter(t => {
        if (t.resolution_due_at && new Date(t.resolution_due_at) < now) return true;
        if (t.acknowledgement_due_at && !t.acknowledged_at && new Date(t.acknowledgement_due_at) < now) return true;
        return false;
      });
      const dueToday = openTickets.filter(t => {
        if (t.resolution_due_at) {
          const dueDate = format(new Date(t.resolution_due_at), 'yyyy-MM-dd');
          return dueDate === today;
        }
        return false;
      });

      const ticketsThisWeek = tickets.filter(t =>
        isWithinInterval(new Date(t.created_at), { start: weekStart, end: weekEnd })
      );
      const breachedThisWeek = ticketsThisWeek.filter(t => t.is_acknowledgement_breached || t.is_resolution_breached);
      const slaCompliance = ticketsThisWeek.length > 0
        ? Math.round(((ticketsThisWeek.length - breachedThisWeek.length) / ticketsThisWeek.length) * 100)
        : 100;

      const ticketsThisMonth = tickets.filter(t => new Date(t.created_at) >= monthStart);
      const reopenedTickets = tickets.filter(t => t.reopened_count > 0);

      const resolvedTickets = tickets.filter(t => t.resolved_at);
      let avgResolutionHours = 0;
      if (resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((acc, t) => {
          const created = new Date(t.created_at);
          const resolved = new Date(t.resolved_at);
          return acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
      }

      setStats({
        totalOpenTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
        ticketsDueToday: dueToday.length,
        slaComplianceWeek: slaCompliance,
        ticketsThisMonth: ticketsThisMonth.length,
        reopenedTickets: reopenedTickets.length,
        totalUsers: users.length,
        totalHRAgents: users.filter(u => u.is_hr_agent).length,
        totalCategories: categories.length,
        avgResolutionHours
      });

      const catMap = new Map<string, number>();
      tickets.forEach(t => {
        const cat = categories.find(c => c.id === t.category_id);
        if (cat) {
          catMap.set(cat.name, (catMap.get(cat.name) || 0) + 1);
        }
      });
      setCategoryStats(
        Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );

      const statusMap = new Map<string, number>();
      const statusLabels: Record<string, string> = {
        'open': 'Open',
        'assigned': 'Assigned',
        'acknowledged': 'Assigned',
        'in_progress': 'In Progress',
        'waiting_for_employee': 'Waiting',
        'waiting_for_internal_review': 'Waiting',
        'resolved': 'Resolved',
        'closed': 'Closed',
        'escalated': 'Escalated',
        'reopened': 'Open'
      };
      tickets.forEach(t => {
        const label = statusLabels[t.status] || t.status;
        statusMap.set(label, (statusMap.get(label) || 0) + 1);
      });
      setStatusStats(
        Array.from(statusMap.entries())
          .map(([name, value]) => ({ name, value }))
          .filter(s => s.value > 0)
      );

      const weeklyData: TrendData[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
        const weekTickets = tickets.filter(t =>
          isWithinInterval(new Date(t.created_at), { start: weekStart, end: weekEnd })
        );
        const weekResolved = tickets.filter(t =>
          t.resolved_at && isWithinInterval(new Date(t.resolved_at), { start: weekStart, end: weekEnd })
        );
        weeklyData.push({
          week: format(weekStart, 'MMM d'),
          tickets: weekTickets.length,
          resolved: weekResolved.length
        });
      }
      setTrendData(weeklyData);

      const slaData: SLATrendData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dayTickets = tickets.filter(t =>
          format(new Date(t.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        const dayBreached = dayTickets.filter(t => t.is_acknowledgement_breached || t.is_resolution_breached);
        const compliance = dayTickets.length > 0
          ? Math.round(((dayTickets.length - dayBreached.length) / dayTickets.length) * 100)
          : 100;
        slaData.push({
          date: format(date, 'EEE'),
          compliance
        });
      }
      setSlaTrendData(slaData);

    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="HR Ticketing System Control Center"
        actions={
          <button
            onClick={loadStats}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Open Tickets</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalOpenTickets}</p>
          <Link to="/admin/tickets?status=open" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            View all
          </Link>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdueTickets}</p>
          <Link to="/admin/tickets?overdue=true" className="text-xs text-red-600 hover:underline mt-1 inline-block">
            View queue
          </Link>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due Today</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.ticketsDueToday}</p>
          <span className="text-xs text-slate-400">Requires attention</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">SLA This Week</span>
            <Target className="w-4 h-4 text-green-500" />
          </div>
          <p className={`text-2xl font-bold ${stats.slaComplianceWeek >= 90 ? 'text-green-600' : stats.slaComplianceWeek >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
            {stats.slaComplianceWeek}%
          </p>
          <span className="text-xs text-slate-400">Compliance rate</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.ticketsThisMonth}</p>
          <span className="text-xs text-slate-400">Tickets created</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reopened</span>
            <RefreshCw className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.reopenedTickets}</p>
          <span className="text-xs text-slate-400">Total reopened</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Ticket Volume Trend</h2>
            <p className="text-xs text-slate-500 mt-1">Last 8 weeks</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="tickets" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">SLA Compliance Trend</h2>
            <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slaTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`${value}%`, 'Compliance']}
                />
                <Line
                  type="monotone"
                  dataKey="compliance"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">By Category</h2>
            <Link to="/admin/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
              Reports <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 h-64">
            {categoryStats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">By Status</h2>
          </div>
          <div className="p-4 h-64">
            {statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusStats.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              to="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900 block">Add User</span>
                <span className="text-xs text-slate-500">Create new employee or HR agent</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900 block">Add Category</span>
                <span className="text-xs text-slate-500">Configure ticket categories</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/admin/sla"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900 block">Configure SLA</span>
                <span className="text-xs text-slate-500">Set acknowledgement and resolution times</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/admin/tickets?overdue=true"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900 block">View Overdue Queue</span>
                <span className="text-xs text-slate-500">{stats.overdueTickets} tickets need attention</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-xs text-slate-400">{stats.totalHRAgents} HR Agents</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCategories}</p>
              <p className="text-sm text-slate-500">Active Categories</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.avgResolutionHours}h</p>
              <p className="text-sm text-slate-500">Avg Resolution Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
