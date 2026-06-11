import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTickets } from '../../services/ticketService';
import { Ticket, TicketStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import {
  Ticket as TicketIcon,
  PlusCircle,
  Search,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  List,
  LayoutGrid,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';

type TabKey = 'open' | 'waiting' | 'resolved' | 'closed';

interface Tab {
  key: TabKey;
  label: string;
  icon: typeof Clock;
  description: string;
  filter: (ticket: Ticket) => boolean;
}

const tabs: Tab[] = [
  {
    key: 'open',
    label: 'Open',
    icon: Clock,
    description: 'Active tickets being worked on',
    filter: (t) => ['open', 'assigned', 'acknowledged', 'in_progress', 'waiting_for_internal_review', 'reopened', 'escalated'].includes(t.status),
  },
  {
    key: 'waiting',
    label: 'Waiting on Me',
    icon: AlertCircle,
    description: 'HR needs your response',
    filter: (t) => t.status === 'waiting_for_employee',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: CheckCircle,
    description: 'Completed tickets pending your confirmation',
    filter: (t) => t.status === 'resolved',
  },
  {
    key: 'closed',
    label: 'Closed',
    icon: XCircle,
    description: 'Archived tickets',
    filter: (t) => t.status === 'closed',
  },
];

type ViewMode = 'list' | 'cards';

export function TicketList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTickets({ requesterId: user.id });
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabCounts = useMemo(() => {
    return tabs.reduce((acc, tab) => {
      acc[tab.key] = tickets.filter(tab.filter).length;
      return acc;
    }, {} as Record<TabKey, number>);
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab) return [];

    let filtered = tickets.filter(currentTab.filter);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.ticket_number.toLowerCase().includes(query) ||
          t.title.toLowerCase().includes(query) ||
          t.category?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tickets, activeTab, searchQuery]);

  const canReopen = (ticket: Ticket): boolean => {
    if (ticket.status !== 'resolved') return false;
    if (!ticket.resolved_at) return false;
    const hoursSinceResolution = differenceInHours(new Date(), new Date(ticket.resolved_at));
    return hoursSinceResolution <= 48;
  };

  const getStatusExplanation = (status: TicketStatus): string => {
    const explanations: Record<TicketStatus, string> = {
      open: 'Waiting to be assigned to an HR agent',
      assigned: 'Assigned to an HR agent, awaiting review',
      acknowledged: 'HR has seen your request and is working on it',
      in_progress: 'Actively being worked on by HR',
      waiting_for_employee: 'HR needs more information from you',
      waiting_for_internal_review: 'Under internal review',
      resolved: 'HR has resolved this - please confirm or reopen if needed',
      closed: 'This ticket has been closed',
      reopened: 'Ticket has been reopened for further attention',
      escalated: 'Escalated for priority handling',
    };
    return explanations[status] || status;
  };

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
          <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-gray-500 mt-1">View and manage your HR requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <PlusCircle className="w-5 h-5" />
            Raise Ticket
          </Link>
        </div>
      </div>

      {tabCounts.waiting > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Action Required</p>
            <p className="text-sm text-amber-700 mt-1">
              You have {tabCounts.waiting} ticket{tabCounts.waiting > 1 ? 's' : ''} waiting for your response.
              Please provide the requested information to help HR resolve your request faster.
            </p>
            <button
              onClick={() => setActiveTab('waiting')}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 mt-2 inline-flex items-center gap-1"
            >
              View tickets
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const count = tabCounts[tab.key];

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
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
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket number, title, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
            <p className="text-sm text-gray-500">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium">No tickets found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Try adjusting your search'
                : tabs.find(t => t.key === activeTab)?.description}
            </p>
            {activeTab === 'open' && !searchQuery && (
              <Link
                to="/tickets/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Raise New Ticket
              </Link>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {ticket.ticket_number}
                  </span>
                  <PriorityBadge priority={ticket.priority} size="sm" />
                </div>
                <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">{ticket.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {ticket.category?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <StatusBadge status={ticket.status} size="sm" />
                  {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                    <SLAIndicator
                      dueAt={ticket.resolution_due_at}
                      completedAt={ticket.resolved_at}
                      isBreached={ticket.is_resolution_breached}
                      compact
                    />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-blue-600">{ticket.ticket_number}</span>
                    <StatusBadge status={ticket.status} size="sm" />
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate">{ticket.title}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-500">{ticket.category?.name}</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                    {ticket.assigned_agent && (
                      <span className="text-xs text-gray-400">
                        Assigned to {ticket.assigned_agent.full_name}
                      </span>
                    )}
                  </div>
                  {activeTab === 'waiting' && (
                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
                      HR is waiting for your response
                    </p>
                  )}
                  {activeTab === 'resolved' && canReopen(ticket) && (
                    <p className="text-xs text-green-600 mt-2">
                      Can be reopened if issue persists
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                    <SLAIndicator
                      dueAt={ticket.resolution_due_at}
                      completedAt={ticket.resolved_at}
                      isBreached={ticket.is_resolution_breached}
                    />
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Understanding Ticket Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: 'open' as TicketStatus, label: 'Open', desc: 'Waiting for HR' },
            { status: 'in_progress' as TicketStatus, label: 'In Progress', desc: 'Being worked on' },
            { status: 'waiting_for_employee' as TicketStatus, label: 'Waiting on You', desc: 'Your input needed' },
            { status: 'resolved' as TicketStatus, label: 'Resolved', desc: 'Done - please confirm' },
          ].map(item => (
            <div key={item.status} className="flex items-center gap-2">
              <StatusBadge status={item.status} size="sm" />
              <span className="text-xs text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
