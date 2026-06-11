import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Clock,
  Users,
  Star,
  AlertTriangle,
  Download,
  RefreshCw,
  Target,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowUpRight
} from 'lucide-react';
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
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';

interface ReportData {
  ticketsByCategory: { name: string; count: number; color: string }[];
  ticketsByStatus: { name: string; count: number; color: string }[];
  ticketsByPriority: { name: string; count: number; color: string }[];
  slaCompliance: { acknowledged: number; resolved: number; total: number };
  agentPerformance: { name: string; resolved: number; avgTime: number; breaches: number; satisfaction: number }[];
  ticketTrend: { date: string; created: number; resolved: number }[];
  avgRating: number;
  totalRatings: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  resolutionByCategory: { name: string; avgTime: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  'New': '#3B82F6',
  'Open': '#10B981',
  'Pending': '#F59E0B',
  'In Progress': '#8B5CF6',
  'Waiting For Employee': '#EC4899',
  'Resolved': '#06B6D4',
  'Closed': '#64748B',
  'Reopened': '#EF4444'
};

const PRIORITY_COLORS: Record<string, string> = {
  'Low': '#64748B',
  'Medium': '#3B82F6',
  'High': '#F59E0B',
  'Critical': '#EF4444'
};

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

type DateRange = '7d' | '30d' | 'mtd' | '90d' | 'all';

export function Reports() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const navigateToTickets = (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    navigate(`/admin/tickets?${params.toString()}`);
  };

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case 'mtd': return startOfMonth(now);
      case '90d': return subDays(now, 90);
      default: return null;
    }
  };

  const loadReportData = async () => {
    if (!loading) setRefreshing(true);
    try {
      const [ticketsRes, categoriesRes, usersRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('ticket_categories').select('*'),
        supabase.from('users').select('*').eq('is_hr_agent', true)
      ]);

      let tickets = ticketsRes.data || [];
      const categories = categoriesRes.data || [];
      const agents = usersRes.data || [];

      const dateFilter = getDateFilter();
      if (dateFilter) {
        tickets = tickets.filter(t =>
          new Date(t.created_at) >= dateFilter
        );
      }

      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const ticketsByCategory = categories.map((cat, idx) => ({
        name: cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name,
        count: tickets.filter(t => t.category_id === cat.id).length,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
      })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

      const statusCounts: Record<string, number> = {};
      tickets.forEach(t => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });
      const ticketsByStatus = Object.entries(statusCounts).map(([status, count]) => {
        const name = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
          name,
          count,
          color: STATUS_COLORS[name] || '#64748B'
        };
      }).sort((a, b) => b.count - a.count);

      const priorityCounts: Record<string, number> = {};
      tickets.forEach(t => {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });
      const ticketsByPriority = ['critical', 'high', 'medium', 'low'].map(p => {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        return {
          name,
          count: priorityCounts[p] || 0,
          color: PRIORITY_COLORS[name]
        };
      });

      const acknowledgedOnTime = tickets.filter(t =>
        t.acknowledged_at && !t.is_acknowledgement_breached
      ).length;
      const resolvedOnTime = tickets.filter(t =>
        t.resolved_at && !t.is_resolution_breached
      ).length;
      const totalAckRequired = tickets.filter(t => t.acknowledged_at).length;
      const totalResRequired = tickets.filter(t => t.resolved_at).length;

      const slaCompliance = {
        acknowledged: totalAckRequired > 0 ? Math.round((acknowledgedOnTime / totalAckRequired) * 100) : 100,
        resolved: totalResRequired > 0 ? Math.round((resolvedOnTime / totalResRequired) * 100) : 100,
        total: tickets.length
      };

      const agentPerformance = agents.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_agent_id === agent.id);
        const resolved = agentTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
        const breaches = agentTickets.filter(t => t.is_acknowledgement_breached || t.is_resolution_breached).length;
        const ratedTickets = agentTickets.filter(t => t.employee_rating);
        const satisfaction = ratedTickets.length > 0
          ? Math.round((ratedTickets.reduce((sum, t) => sum + t.employee_rating, 0) / ratedTickets.length) * 20)
          : 0;

        let avgTime = 0;
        const resolvedWithTime = agentTickets.filter(t => t.resolved_at && t.created_at);
        if (resolvedWithTime.length > 0) {
          const totalHours = resolvedWithTime.reduce((sum, t) => {
            const created = new Date(t.created_at);
            const resolved = new Date(t.resolved_at);
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0);
          avgTime = Math.round(totalHours / resolvedWithTime.length);
        }

        return {
          name: agent.full_name.split(' ')[0],
          resolved,
          avgTime,
          breaches,
          satisfaction
        };
      }).filter(a => a.resolved > 0 || a.breaches > 0);

      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 30;
      const ticketTrend: { date: string; created: number; resolved: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const created = tickets.filter(t => t.created_at.startsWith(dateStr)).length;
        const resolved = tickets.filter(t => t.resolved_at?.startsWith(dateStr)).length;
        ticketTrend.push({
          date: format(date, days > 30 ? 'MMM d' : 'MMM d'),
          created,
          resolved
        });
      }

      const ratedTickets = tickets.filter(t => t.employee_rating);
      const avgRating = ratedTickets.length > 0
        ? ratedTickets.reduce((sum, t) => sum + t.employee_rating, 0) / ratedTickets.length
        : 0;

      const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));
      let avgResolutionTime = 0;
      if (resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((sum, t) => {
          if (!t.resolved_at) return sum;
          const created = new Date(t.created_at);
          const resolved = new Date(t.resolved_at);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgResolutionTime = Math.round(totalHours / resolvedTickets.length);
      }

      const resolutionByCategory = categories.map(cat => {
        const catTickets = tickets.filter(t => t.category_id === cat.id && t.resolved_at);
        if (catTickets.length === 0) return { name: cat.name, avgTime: 0 };
        const totalHours = catTickets.reduce((sum, t) => {
          const created = new Date(t.created_at);
          const resolved = new Date(t.resolved_at);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        return {
          name: cat.name.length > 10 ? cat.name.substring(0, 10) + '...' : cat.name,
          avgTime: Math.round(totalHours / catTickets.length)
        };
      }).filter(c => c.avgTime > 0).sort((a, b) => a.avgTime - b.avgTime);

      setData({
        ticketsByCategory,
        ticketsByStatus,
        ticketsByPriority,
        slaCompliance,
        agentPerformance,
        ticketTrend,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratedTickets.length,
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length,
        resolvedTickets: resolvedTickets.length,
        avgResolutionTime,
        resolutionByCategory
      });
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Tickets', data.totalTickets],
      ['Open Tickets', data.openTickets],
      ['Resolved Tickets', data.resolvedTickets],
      ['Avg Resolution Time (hrs)', data.avgResolutionTime],
      ['Ack SLA Compliance', `${data.slaCompliance.acknowledged}%`],
      ['Resolution SLA Compliance', `${data.slaCompliance.resolved}%`],
      ['Average Rating', data.avgRating],
      ['Total Ratings', data.totalRatings],
      [''],
      ['Category', 'Count'],
      ...data.ticketsByCategory.map(c => [c.name, c.count]),
      [''],
      ['Status', 'Count'],
      ...data.ticketsByStatus.map(s => [s.name, s.count]),
      [''],
      ['Agent', 'Resolved', 'Breaches', 'Satisfaction'],
      ...data.agentPerformance.map(a => [a.name, a.resolved, a.breaches, `${a.satisfaction}%`])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-ticketing-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Failed to load reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="HR ticketing system performance metrics and insights"
        breadcrumbs={[{ label: 'Reports' }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              {(['7d', '30d', 'mtd', '90d', 'all'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === '7d' ? '7D' : range === '30d' ? '30D' : range === 'mtd' ? 'MTD' : range === '90d' ? '90D' : 'All'}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadReportData()}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => navigateToTickets({})}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Total Tickets</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalTickets}</p>
        </button>

        <button
          onClick={() => navigateToTickets({ status: 'open' })}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Open</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.openTickets}</p>
        </button>

        <button
          onClick={() => navigateToTickets({ status: 'resolved' })}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Resolved</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-green-500 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.resolvedTickets}</p>
        </button>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-teal-50">
              <Timer className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Avg Resolution</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.avgResolutionTime}<span className="text-sm font-normal text-gray-400">h</span></p>
        </div>

        <button
          onClick={() => navigateToTickets({ breached: 'true' })}
          className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${data.slaCompliance.resolved >= 90 ? 'bg-green-50' : data.slaCompliance.resolved >= 75 ? 'bg-amber-50' : 'bg-red-50'}`}>
                <Target className={`w-4 h-4 ${data.slaCompliance.resolved >= 90 ? 'text-green-600' : data.slaCompliance.resolved >= 75 ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
              <span className="text-xs font-medium text-gray-500">SLA Compliance</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
          <p className={`text-2xl font-bold ${data.slaCompliance.resolved >= 90 ? 'text-green-600' : data.slaCompliance.resolved >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{data.slaCompliance.resolved}%</p>
        </button>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-yellow-50">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <span className="text-xs font-medium text-gray-500">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.avgRating || '-'}<span className="text-sm font-normal text-gray-400">/5</span></p>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalRatings} ratings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ticket Volume Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ticketTrend}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" name="Created" stroke="#3B82F6" fill="url(#colorCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" fill="url(#colorResolved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tickets by Status</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.ticketsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {data.ticketsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.ticketsByStatus.slice(0, 6).map((status) => (
              <div key={status.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-gray-600 truncate">{status.name}</span>
                <span className="font-medium text-gray-900 ml-auto">{status.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tickets by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ticketsByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.ticketsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Avg Resolution Time by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.resolutionByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value} hours`, 'Avg Time']} />
                <Bar dataKey="avgTime" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Agent Performance</h3>
        {data.agentPerformance.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p>No agent data available for this period</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Resolved</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Breaches</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Satisfaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.agentPerformance.map((agent) => (
                    <tr key={agent.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-white">{agent.name[0]}</span>
                          </div>
                          <span className="font-medium text-gray-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {agent.resolved}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{agent.avgTime}h</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {agent.breaches > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
                            <XCircle className="w-3 h-3" />
                            {agent.breaches}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {agent.satisfaction > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  agent.satisfaction >= 80 ? 'bg-green-500' :
                                  agent.satisfaction >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${agent.satisfaction}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{agent.satisfaction}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.ticketsByPriority.map((item) => (
          <button
            key={item.name}
            onClick={() => navigateToTickets({ priority: item.name.toLowerCase() })}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{item.name} Priority</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{item.count}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {data.totalTickets > 0 ? Math.round((item.count / data.totalTickets) * 100) : 0}% of total
              </p>
              <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: item.color,
                    width: `${data.totalTickets > 0 ? (item.count / data.totalTickets) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
