import { supabase } from '../lib/supabase';

export interface SearchResult {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  requester_name: string;
  category_name: string | null;
}

export const searchService = {
  async searchTickets(query: string, userId: string, isAdmin: boolean, isHRAgent: boolean): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    let queryBuilder = supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        title,
        status,
        priority,
        requester_name,
        requester_id,
        assigned_agent_id,
        ticket_categories!tickets_category_id_fkey (name)
      `)
      .or(`ticket_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,requester_name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!isAdmin && !isHRAgent) {
      queryBuilder = queryBuilder.eq('requester_id', userId);
    } else if (isHRAgent && !isAdmin) {
      queryBuilder = queryBuilder.or(`assigned_agent_id.eq.${userId},requester_id.eq.${userId}`);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return (data || []).map(ticket => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      requester_name: ticket.requester_name,
      category_name: ticket.ticket_categories?.name || null
    }));
  }
};
