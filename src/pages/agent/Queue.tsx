import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTickets } from '../../services/ticketService';
import { supabase } from '../../lib/supabase';
import { Ticket, TicketStatus, Category } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import {
  ClipboardList,
  Search,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowUp,
  Calendar,
  User,
  ChevronRight,
  RefreshCw,
  X,
  Filter,
  Inbox,
  AlertCircle,
  Timer,
  Hourglass
} from 'lucide-react';
import { formatDistanceToNow, isToday, isPast, format, startOfDay, endOfDay } from 'date-fns';

type QueuePreset = 'my_open' | 'unacknowledged' | 'due_today' | 'overdue' | 'waiting_employee' | 'escalated' | 'resolved_today' | 'all_eligible';

interface PresetConfig {
  key: QueuePreset;
  label: string;
  icon: typeof Clock;
  color: string;
  filter: (ticket: Ticket, userId: string) => boolean;
}

const presets: PresetConfig[] = [
  {
    key: 'my_open',
    label: 'My Open Tickets',
    icon: Inbox,
    color: 'bg-blue-100 text-blue-700',
    filter: (t, userId) =>
      t.assigned_agent_id === userId &&
      ['assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'].includes(t.status)
  },
  {
    key: 'unacknowledged',
    label: 'Unacknowledged',
    icon: AlertCircle,
    color: 'bg-amber-100 text-amber-700',
    filter: (t, userId) =>
      t.assigned_agent_id === userId &&
      t.status === 'assigned' &&
      !t.acknowledged_at
  },
  {
    key: 'due_today',
    label: 'Due Today',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-700',
    filter: (t, userId) => {
      if (t.assigned_agent_id !== userId) return false;
      if (['resolved', 'closed'].includes(t.status)) return false;
      if (!t.resolution_due_at) return false;
      const due = new Date(t.resolution_due_at);
      return isToday(due);
    }
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700',
    filter: (t, userId) => {
      if (t.assigned_agent_id !== userId) return false;
      if (['resolved', 'closed'].includes(t.status)) return false;
      return t.is_resolution_breached || t.is_acknowledgement_breached;
    }
  },
  {
    key: 'waiting_employee',
    label: 'Waiting for Employee',
    icon: Hourglass,
    color: 'bg-cyan-100 text-cyan-700',
    filter: (t, userId) =>
      t.assigned_agent_id === userId &&
      t.status === 'waiting_for_employee'
  },
  {
    key: 'escalated',
    label: 'Escalated',
    icon: ArrowUp,
    color: 'bg-rose-100 text-rose-700',
    filter: (t, userId) =>
      t.assigned_agent_id === userId &&
      t.status === 'escalated'
  },
  {
    key: 'resolved_today',
    label: 'Resolved Today',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
    filter: (t, userId) => {
      if (t.assigned_agent_id !== userId) return false;
      if (t.status !== 'resolved') return false;
      if (!t.resolved_at) return false;
      return isToday(new Date(t.resolved_at));
    }
  },
  {
    key: 'all_eligible',
    label: 'All Eligible',
    icon: ClipboardList,
    color: 'bg-gray-100 text-gray-700',
    filter: () => true
  }
];

export function AgentQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<QueuePreset>('my_open');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await fetchTickets({ assignedAgentId: user.id });

      const categoryIds = user.mapped_categories?.map((c: Category) => c.id) || [];
      let eligibleTickets: Ticket[] = [];
      if (categoryIds.length > 0) {
        eligibleTickets = await fetchTickets({ categoryIds });
      }

      const combined = [...data];
      eligibleTickets.forEach(t => {
        if (!combined.find(c => c.id === t.id)) {
          combined.push(t);
        }
      });

      const openStatuses: TicketStatus[] = ['open', 'assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated', 'resolved'];
      setAllTickets(combined.filter(t => openStatuses.includes(t.status)));
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const presetCounts = useMemo(() => {
    if (!user) return {} as Record<QueuePreset, number>;
    return presets.reduce((acc, preset) => {
      acc[preset.key] = allTickets.filter(t => preset.filter(t, user.id)).length;
      return acc;
    }, {} as Record<QueuePreset, number>);
  }, [allTickets, user]);

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    allTickets.forEach(t => {
      if (t.category) {
        cats.set(t.category.id, t.category.name);
      }
    });
    return Array.from(cats.entries());
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    if (!user) return [];

    const preset = presets.find(p => p.key === activePreset);
    if (!preset) return [];

    let filtered = allTickets.filter(t => preset.filter(t, user.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.ticket_number.toLowerCase().includes(query) ||
          t.title.toLowerCase().includes(query) ||
          t.requester_name.toLowerCase().includes(query) ||
          t.category?.name.toLowerCase().includes(query)
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category_id === categoryFilter);
    }

    filtered.sort((a, b) => {
      if (a.is_resolution_breached !== b.is_resolution_breached) {
        return a.is_resolution_breached ? -1 : 1;
      }
      if (a.is_acknowledgement_breached !== b.is_acknowledgement_breached) {
        return a.is_acknowledgement_breached ? -1 : 1;
      }
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return filtered;
  }, [allTickets, activePreset, searchQuery, priorityFilter, categoryFilter, user]);

  const stats = useMemo(() => {
    if (!user) return { open: 0, overdue: 0, dueToday: 0, avgResponseTime: 0 };

    const myTickets = allTickets.filter(t => t.assigned_agent_id === user.id);
    const openStatuses: TicketStatus[] = ['assigned', 'acknowledged', 'in_progress', 'waiting_for_employee', 'waiting_for_internal_review', 'reopened', 'escalated'];
    const open = myTickets.filter(t => openStatuses.includes(t.status)).length;
    const overdue = myTickets.filter(t =>
      !['resolved', 'closed'].includes(t.status) &&
      (t.is_resolution_breached || t.is_acknowledgement_breached)
    ).length;
    const dueToday = myTickets.filter(t => {
      if (['resolved', 'closed'].includes(t.status)) return false;
      if (!t.resolution_due_at) return false;
      return isToday(new Date(t.resolution_due_at));
    }).length;

    return { open, overdue, dueToday, avgResponseTime: 0 };
  }, [allTickets, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Queue Filters</h2>
          <button
            onClick={loadTickets}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="p-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const count = presetCounts[preset.key] || 0;
            const isActive = activePreset === preset.key;

            return (
              <button
                key={preset.key}
                onClick={() => setActivePreset(preset.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${preset.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{preset.label}</span>
                </div>
                {count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Open Tickets</span>
              <span className="font-semibold text-gray-900">{stats.open}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overdue</span>
              <span className={`font-semibold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.overdue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Due Today</span>
              <span className={`font-semibold ${stats.dueToday > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {stats.dueToday}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by ID, title, requester, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  {categories.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              {(priorityFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => { setPriorityFilter('all'); setCategoryFilter('all'); }}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={`${selectedTicket ? 'w-1/2' : 'w-full'} overflow-y-auto bg-gray-50 transition-all`}>
            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No tickets in this queue</p>
                <p className="text-sm text-gray-400 mt-1">Try selecting a different filter</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  const isOverdue = ticket.is_resolution_breached || ticket.is_acknowledgement_breached;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(isSelected ? null : ticket)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                      } ${isOverdue ? 'border-l-red-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-600">{ticket.ticket_number}</span>
                            <PriorityBadge priority={ticket.priority} size="sm" />
                            {isOverdue && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 truncate">{ticket.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">{ticket.requester_name}</span>
                            <span className="text-xs text-gray-400">{ticket.category?.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={ticket.status} size="sm" />
                          <div className="flex items-center gap-2">
                            {!ticket.acknowledged_at && ticket.status === 'assigned' && (
                              <SLAIndicator
                                dueAt={ticket.acknowledgement_due_at}
                                completedAt={ticket.acknowledged_at}
                                isBreached={ticket.is_acknowledgement_breached}
                                compact
                              />
                            )}
                            <SLAIndicator
                              dueAt={ticket.resolution_due_at}
                              completedAt={ticket.resolved_at}
                              isBreached={ticket.is_resolution_breached}
                              pausedAt={ticket.sla_paused_at}
                              compact
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                        {ticket.comments && ticket.comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTicket && (
            <div className="w-1/2 border-l border-gray-200 bg-white overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Quick Preview</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-blue-600">{selectedTicket.ticket_number}</span>
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityBadge priority={selectedTicket.priority} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.title}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block mb-1">Requester</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 block">{selectedTicket.requester_name}</span>
                        <span className="text-xs text-gray-500">{selectedTicket.department?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Category</span>
                    <span className="font-medium text-gray-900">{selectedTicket.category?.name}</span>
                    {selectedTicket.subcategory && (
                      <span className="text-xs text-gray-500 block">{selectedTicket.subcategory.name}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Created</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Last Updated</span>
                    <span className="font-medium text-gray-900">
                      {formatDistanceToNow(new Date(selectedTicket.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block mb-2 text-sm">SLA Status</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Acknowledgement</span>
                      <SLAIndicator
                        dueAt={selectedTicket.acknowledgement_due_at}
                        completedAt={selectedTicket.acknowledged_at}
                        isBreached={selectedTicket.is_acknowledgement_breached}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Resolution</span>
                      <SLAIndicator
                        dueAt={selectedTicket.resolution_due_at}
                        completedAt={selectedTicket.resolved_at}
                        isBreached={selectedTicket.is_resolution_breached}
                        pausedAt={selectedTicket.sla_paused_at}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block mb-2 text-sm">Description</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                    {selectedTicket.description}
                  </p>
                </div>

                <Link
                  to={`/agent/ticket/${selectedTicket.id}`}
                  className="block w-full text-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open Full Workbench
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
