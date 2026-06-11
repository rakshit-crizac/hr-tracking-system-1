import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Ticket, Category } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { SLAIndicator } from '../../components/ui/SLAIndicator';
import { PageHeader } from '../../components/ui/PageHeader';
import { Ticket as TicketIcon, Search, Filter, Loader2, Download, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AllTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'all');
  const [breachedFilter, setBreachedFilter] = useState(searchParams.get('breached') === 'true');
  const [overdueFilter, setOverdueFilter] = useState(searchParams.get('overdue') === 'true');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const newStatus = searchParams.get('status') || 'all';
    const newPriority = searchParams.get('priority') || 'all';
    const newCategory = searchParams.get('category') || 'all';
    const newBreached = searchParams.get('breached') === 'true';
    const newOverdue = searchParams.get('overdue') === 'true';

    setStatusFilter(newStatus);
    setPriorityFilter(newPriority);
    setCategoryFilter(newCategory);
    setBreachedFilter(newBreached);
    setOverdueFilter(newOverdue);
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [ticketsRes, categoriesRes] = await Promise.all([
        supabase
          .from('tickets')
          .select(`
            *,
            category:ticket_categories(*),
            assigned_agent:users!tickets_assigned_agent_id_fkey(*),
            department:departments(*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('ticket_categories').select('*').eq('is_active', true).order('display_order')
      ]);

      setTickets((ticketsRes.data || []) as Ticket[]);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setBreachedFilter(false);
    setOverdueFilter(false);
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || breachedFilter || overdueFilter || searchQuery;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      !searchQuery ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.requester_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category_id === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesBreached = !breachedFilter || ticket.is_acknowledgement_breached || ticket.is_resolution_breached;
    const matchesOverdue = !overdueFilter || ticket.is_resolution_breached || ticket.is_acknowledgement_breached;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesBreached && matchesOverdue;
  });

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
        title="All Tickets"
        subtitle={`${filteredTickets.length} of ${tickets.length} tickets`}
        breadcrumbs={[{ label: 'Tickets' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket #, title, or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_employee">Waiting for Employee</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  Status: {statusFilter.replace(/_/g, ' ')}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {priorityFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                  Priority: {priorityFilter}
                  <button onClick={() => setPriorityFilter('all')} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                  Category: {categories.find(c => c.id === categoryFilter)?.name}
                  <button onClick={() => setCategoryFilter('all')} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(breachedFilter || overdueFilter) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
                  SLA Breached
                  <button onClick={() => { setBreachedFilter(false); setOverdueFilter(false); }} className="hover:text-red-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/agent/ticket/${ticket.id}`} className="block">
                        <span className="text-sm font-medium text-blue-600 block">
                          {ticket.ticket_number}
                        </span>
                        <span className="text-sm text-gray-900 line-clamp-1">{ticket.title}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{ticket.requester_name}</span>
                      <span className="text-xs text-gray-500 block">{ticket.department?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{ticket.category?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={ticket.priority} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {ticket.assigned_agent?.full_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <SLAIndicator
                          dueAt={ticket.resolution_due_at}
                          completedAt={ticket.resolved_at}
                          isBreached={ticket.is_resolution_breached}
                        />
                      )}
                      {(ticket.is_acknowledgement_breached || ticket.is_resolution_breached) && (
                        <span className="text-xs text-red-600 block mt-1">Breached</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}