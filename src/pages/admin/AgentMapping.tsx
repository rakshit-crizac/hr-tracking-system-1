import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Category, AgentCategoryMapping } from '../../types';
import {
  UserCog,
  Loader2,
  FolderKanban,
  Check,
  X,
  AlertCircle,
  Users,
  Tag,
  RefreshCw,
  Info
} from 'lucide-react';

interface AgentWithMappings extends User {
  mappedCategoryIds: string[];
  mappings: Record<string, AgentCategoryMapping>;
}

export function AgentMapping() {
  const [agents, setAgents] = useState<AgentWithMappings[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, categoriesRes, mappingsRes] = await Promise.all([
        supabase.from('users').select('*').eq('is_hr_agent', true).order('full_name'),
        supabase.from('ticket_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('agent_category_mappings').select('*')
      ]);

      const mappings = mappingsRes.data || [];
      const agentsWithMappings = (agentsRes.data || []).map(agent => {
        const agentMappings = mappings.filter(m => m.agent_id === agent.id);
        const mappingsRecord: Record<string, AgentCategoryMapping> = {};
        agentMappings.forEach(m => {
          mappingsRecord[m.category_id] = m;
        });
        return {
          ...agent,
          mappedCategoryIds: agentMappings.filter(m => m.is_active).map(m => m.category_id),
          mappings: mappingsRecord
        };
      }) as AgentWithMappings[];

      setAgents(agentsWithMappings);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMapping = async (agentId: string, categoryId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const existingMapping = agent.mappings[categoryId];
    const savingKey = `${agentId}-${categoryId}`;
    setSaving(savingKey);

    try {
      if (existingMapping) {
        const { error: updateError } = await supabase
          .from('agent_category_mappings')
          .update({ is_active: !existingMapping.is_active })
          .eq('id', existingMapping.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('agent_category_mappings')
          .insert([{ agent_id: agentId, category_id: categoryId, is_active: true }]);

        if (insertError) throw insertError;
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update mapping:', err);
    } finally {
      setSaving(null);
    }
  };

  const totalMappings = agents.reduce((sum, agent) => sum + agent.mappedCategoryIds.length, 0);
  const agentsWithNoMappings = agents.filter(a => a.mappedCategoryIds.length === 0).length;
  const categoriesWithNoAgents = categories.filter(cat =>
    !agents.some(a => a.mappedCategoryIds.includes(cat.id))
  ).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Agent Category Mapping</h1>
          <p className="text-gray-500 mt-1">Assign HR agents to ticket categories for auto-assignment</p>
        </div>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCog className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              <p className="text-sm text-gray-500">HR Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMappings}</p>
              <p className="text-sm text-gray-500">Active Mappings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${agentsWithNoMappings > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Users className={`w-5 h-5 ${agentsWithNoMappings > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{agentsWithNoMappings}</p>
              <p className="text-sm text-gray-500">Unmapped Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoriesWithNoAgents > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <FolderKanban className={`w-5 h-5 ${categoriesWithNoAgents > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categoriesWithNoAgents}</p>
              <p className="text-sm text-gray-500">Uncovered Categories</p>
            </div>
          </div>
        </div>
      </div>

      {(agentsWithNoMappings > 0 || categoriesWithNoAgents > 0) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Attention Required</p>
            <p className="text-sm text-amber-700 mt-1">
              {agentsWithNoMappings > 0 && `${agentsWithNoMappings} agent(s) have no category assignments and won't receive tickets. `}
              {categoriesWithNoAgents > 0 && `${categoriesWithNoAgents} category(ies) have no assigned agents and tickets cannot be auto-routed.`}
            </p>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No HR agents found</p>
          <p className="text-sm text-gray-400 mt-1">Create HR agent accounts first in User Management</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Agent
                  </th>
                  {categories.map((category) => (
                    <th
                      key={category.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className={`p-1.5 rounded ${category.is_sensitive ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <FolderKanban className={`w-3 h-3 ${category.is_sensitive ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                        <span className="text-[10px]">{category.name}</span>
                        {category.is_sensitive && (
                          <span className="text-[8px] px-1 bg-red-100 text-red-600 rounded">POSH</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-white">
                            {agent.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{agent.full_name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-gray-500">{agent.employee_code}</p>
                            {agent.is_posh_handler && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                                POSH
                              </span>
                            )}
                          </div>
                          {!agent.is_active && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded mt-1">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {categories.map((category) => {
                      const isMapped = agent.mappedCategoryIds.includes(category.id);
                      const isSaving = saving === `${agent.id}-${category.id}`;
                      const canAssign = !category.is_sensitive || agent.is_posh_handler;

                      return (
                        <td key={category.id} className="px-4 py-4 text-center">
                          {!canAssign ? (
                            <div
                              className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 rounded-full cursor-not-allowed"
                              title="Only POSH handlers can be assigned to sensitive categories"
                            >
                              <X className="w-4 h-4 text-gray-300" />
                            </div>
                          ) : isSaving ? (
                            <div className="inline-flex items-center justify-center w-8 h-8">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleMapping(agent.id, category.id)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                                isMapped
                                  ? 'bg-green-100 hover:bg-green-200'
                                  : 'bg-gray-100 hover:bg-blue-100'
                              }`}
                              title={isMapped ? 'Click to unassign' : 'Click to assign'}
                            >
                              {isMapped ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <span className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-blue-400"></span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                        agent.mappedCategoryIds.length > 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {agent.mappedCategoryIds.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-6 py-3 sticky left-0 bg-gray-50 font-medium text-gray-700">
                    Agents per Category
                  </td>
                  {categories.map((category) => {
                    const agentCount = agents.filter(a => a.mappedCategoryIds.includes(category.id)).length;
                    return (
                      <td key={category.id} className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          agentCount > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {agentCount}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                      {totalMappings}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">How Assignment Works</p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
            <li>Tickets are automatically assigned to eligible agents based on category mapping</li>
            <li>When multiple agents are available, the one with the lowest current ticket count is selected</li>
            <li>Sensitive (POSH) categories require agents to have POSH handler permissions</li>
            <li>Inactive agents are skipped during auto-assignment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
