import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { AuditLog } from '../../types';
import {
  FileText,
  Search,
  Filter,
  Loader2,
  Clock,
  Activity,
  Users,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, startOfDay, isWithinInterval, isToday } from 'date-fns';

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  status_changed: 'bg-blue-100 text-blue-700',
  assigned: 'bg-cyan-100 text-cyan-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
  reopened: 'bg-amber-100 text-amber-700',
  rated: 'bg-yellow-100 text-yellow-700',
  breached: 'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
  comment_added: 'bg-teal-100 text-teal-700',
  priority_changed: 'bg-rose-100 text-rose-700',
};

const actionIcons: Record<string, typeof Activity> = {
  created: CheckCircle,
  status_changed: ArrowUpDown,
  breached: AlertTriangle,
  escalated: AlertTriangle,
};

type DateRange = '24h' | '7d' | '30d' | '90d' | 'all';

const ITEMS_PER_PAGE = 50;

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeStart = (range: DateRange): Date | null => {
    const now = new Date();
    switch (range) {
      case '24h': return subDays(now, 1);
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      default: return null;
    }
  };

  const filteredLogs = useMemo(() => {
    const dateStart = getDateRangeStart(dateRange);

    return logs.filter((log) => {
      const logDate = new Date(log.created_at);

      if (dateStart && logDate < dateStart) return false;

      const matchesSearch =
        !searchQuery ||
        log.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performed_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, actionFilter, dateRange]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = subDays(now, 7);

    const todayLogs = logs.filter(l => isToday(new Date(l.created_at)));
    const weekLogs = logs.filter(l => {
      const d = new Date(l.created_at);
      return isWithinInterval(d, { start: weekStart, end: now });
    });

    const uniqueUsers = new Set(logs.map(l => l.performed_by_name).filter(Boolean));
    const breachCount = logs.filter(l => l.action === 'breached').length;

    return {
      total: logs.length,
      today: todayLogs.length,
      thisWeek: weekLogs.length,
      uniqueUsers: uniqueUsers.size,
      breaches: breachCount,
    };
  }, [logs]);

  const actionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredLogs]);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Ticket', 'Action', 'Description', 'Performed By'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.ticket_number || '',
      log.action,
      log.description || '',
      log.performed_by_name || 'System'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">System activity and change history</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Logs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Calendar className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.breaches > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${stats.breaches > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.breaches}</p>
              <p className="text-sm text-gray-500">SLA Breaches</p>
            </div>
          </div>
        </div>
      </div>

      {actionStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Top Actions (Filtered Period)</h3>
          <div className="flex flex-wrap gap-3">
            {actionStats.map(([action, count]) => (
              <div
                key={action}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  actionColors[action] || 'bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-sm font-medium capitalize">{action.replace(/_/g, ' ')}</span>
                <span className="text-xs font-bold bg-white/50 px-1.5 py-0.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket, user, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredLogs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length.toLocaleString()} logs
            </span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {paginatedLogs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                return (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${actionColors[log.action] || 'bg-gray-100'}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {log.ticket_number && (
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                              {log.ticket_number}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              actionColors[log.action] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{log.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-gray-500">
                            by <span className="font-medium">{log.performed_by_name || 'System'}</span>
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span title={format(new Date(log.created_at), 'MMM d, yyyy h:mm:ss a')}>
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}