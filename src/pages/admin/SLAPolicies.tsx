import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SLAPolicy, Category, TicketPriority } from '../../types';
import { Clock, Loader2, Plus, CreditCard as Edit2, Save, AlertCircle, Check, X, Trash2, Timer, AlertTriangle, Gauge } from 'lucide-react';
import { formatSLATime } from '../../services/slaService';

interface SLAPolicyWithCategory extends SLAPolicy {
  category: Category;
}

interface SLAFormData {
  category_id: string;
  priority: TicketPriority;
  acknowledgement_hours: number;
  resolution_hours: number;
  first_action_hours: number | null;
  is_active: boolean;
}

const initialFormData: SLAFormData = {
  category_id: '',
  priority: 'medium',
  acknowledgement_hours: 4,
  resolution_hours: 24,
  first_action_hours: null,
  is_active: true
};

const priorityConfig: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  low: { label: 'Low', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

const priorityOrder: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

export function SLAPolicies() {
  const [policies, setPolicies] = useState<SLAPolicyWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [formData, setFormData] = useState<SLAFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [policiesRes, categoriesRes] = await Promise.all([
        supabase
          .from('sla_policies')
          .select('*, category:ticket_categories(*)')
          .order('category_id')
          .order('priority'),
        supabase
          .from('ticket_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
      ]);

      if (policiesRes.error) throw policiesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setPolicies((policiesRes.data || []) as SLAPolicyWithCategory[]);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupedPolicies = policies.reduce((acc, policy) => {
    const catId = policy.category_id;
    if (!acc[catId]) {
      acc[catId] = { category: policy.category, policies: [] };
    }
    acc[catId].policies.push(policy);
    return acc;
  }, {} as Record<string, { category: Category; policies: SLAPolicyWithCategory[] }>);

  const openCreateModal = (categoryId?: string) => {
    setEditingPolicy(null);
    setFormData({
      ...initialFormData,
      category_id: categoryId || ''
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      category_id: policy.category_id,
      priority: policy.priority,
      acknowledgement_hours: policy.acknowledgement_hours,
      resolution_hours: policy.resolution_hours,
      first_action_hours: policy.first_action_hours,
      is_active: policy.is_active
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.category_id || !formData.priority) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.acknowledgement_hours >= formData.resolution_hours) {
      setError('Resolution time must be greater than acknowledgement time');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const policyData = {
        category_id: formData.category_id,
        priority: formData.priority,
        acknowledgement_hours: formData.acknowledgement_hours,
        resolution_hours: formData.resolution_hours,
        first_action_hours: formData.first_action_hours,
        is_active: formData.is_active
      };

      if (editingPolicy) {
        const { error: updateError } = await supabase
          .from('sla_policies')
          .update(policyData)
          .eq('id', editingPolicy.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sla_policies')
          .insert([policyData]);

        if (insertError) throw insertError;
      }

      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const togglePolicyStatus = async (policy: SLAPolicy) => {
    try {
      const { error: updateError } = await supabase
        .from('sla_policies')
        .update({ is_active: !policy.is_active })
        .eq('id', policy.id);

      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Failed to update policy status:', err);
    }
  };

  const totalPolicies = policies.length;
  const activePolicies = policies.filter(p => p.is_active).length;
  const avgAckTime = policies.length > 0
    ? policies.reduce((sum, p) => sum + p.acknowledgement_hours, 0) / policies.length
    : 0;
  const avgResTime = policies.length > 0
    ? policies.reduce((sum, p) => sum + p.resolution_hours, 0) / policies.length
    : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">SLA Policies</h1>
          <p className="text-gray-500 mt-1">Configure Service Level Agreement targets by category and priority</p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add SLA Policy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPolicies}</p>
              <p className="text-sm text-gray-500">Total Policies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activePolicies}</p>
              <p className="text-sm text-gray-500">Active Policies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Timer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgAckTime.toFixed(1)}h</p>
              <p className="text-sm text-gray-500">Avg Ack Time</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Gauge className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgResTime.toFixed(1)}h</p>
              <p className="text-sm text-gray-500">Avg Resolution Time</p>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(groupedPolicies).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No SLA policies configured</p>
          <button
            onClick={() => openCreateModal()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first SLA policy
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPolicies).map(([categoryId, { category, policies: categoryPolicies }]) => (
            <div key={categoryId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    category?.is_sensitive ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <Clock className={`w-5 h-5 ${category?.is_sensitive ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{category?.name || 'Unknown Category'}</h2>
                    <p className="text-sm text-gray-500">{categoryPolicies.length} policies configured</p>
                  </div>
                  {category?.is_sensitive && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                      Sensitive
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openCreateModal(categoryId)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Policy
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acknowledgement SLA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resolution SLA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categoryPolicies
                      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
                      .map((policy) => {
                        const config = priorityConfig[policy.priority];
                        return (
                          <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                {policy.priority === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {config.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {formatSLATime(policy.acknowledgement_hours)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {formatSLATime(policy.resolution_hours)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {policy.first_action_hours
                                  ? formatSLATime(policy.first_action_hours)
                                  : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {policy.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  <Check className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded">
                                  <X className="w-3 h-3" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(policy)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit policy"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => togglePolicyStatus(policy)}
                                  className={`p-1.5 rounded transition-colors ${
                                    policy.is_active
                                      ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                  title={policy.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {policy.is_active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPolicy ? 'Edit SLA Policy' : 'Add SLA Policy'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingPolicy ? 'Update SLA targets' : 'Configure SLA targets for a category and priority'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingPolicy}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingPolicy}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acknowledgement (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.acknowledgement_hours}
                    onChange={(e) => setFormData({ ...formData, acknowledgement_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0.5}
                    step={0.5}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Time to first response
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.resolution_hours}
                    onChange={(e) => setFormData({ ...formData, resolution_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Time to close ticket
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Action (hours)
                </label>
                <input
                  type="number"
                  value={formData.first_action_hours || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    first_action_hours: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0.5}
                  step={0.5}
                  placeholder="Optional"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Time for first meaningful action (leave empty if not applicable)
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-600">Ack:</span>
                    <span className="font-medium">{formatSLATime(formData.acknowledgement_hours)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-600">Resolution:</span>
                    <span className="font-medium">{formatSLATime(formData.resolution_hours)}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">This SLA policy is in effect</p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingPolicy ? 'Update Policy' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
