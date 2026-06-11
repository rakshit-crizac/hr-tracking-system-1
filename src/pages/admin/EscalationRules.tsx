import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { EscalationRule, Category, TicketPriority, User } from '../../types';
import { Shield, Loader2, Clock, Check, X, Plus, CreditCard as Edit2, Trash2, Save, AlertCircle, AlertTriangle, Bell, Mail, ChevronRight } from 'lucide-react';
import { formatSLATime } from '../../services/slaService';

interface RuleWithCategory extends EscalationRule {
  category?: Category;
}

interface EscalationFormData {
  name: string;
  category_id: string;
  priority: TicketPriority | 'all';
  level: number;
  trigger_after_hours: number;
  notify_email: boolean;
  notify_in_app: boolean;
  is_active: boolean;
}

const initialFormData: EscalationFormData = {
  name: '',
  category_id: '',
  priority: 'all',
  level: 1,
  trigger_after_hours: 4,
  notify_email: true,
  notify_in_app: true,
  is_active: true
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  all: { label: 'All Priorities', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  low: { label: 'Low', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

export function EscalationRules() {
  const [rules, setRules] = useState<RuleWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState<EscalationFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, categoriesRes] = await Promise.all([
        supabase.from('escalation_rules').select('*').order('level').order('trigger_after_hours'),
        supabase.from('ticket_categories').select('*').eq('is_active', true).order('display_order')
      ]);

      const categoriesList = categoriesRes.data || [];
      const rulesList = (rulesRes.data || []).map(rule => ({
        ...rule,
        category: categoriesList.find(c => c.id === rule.category_id)
      }));

      setRules(rulesList as RuleWithCategory[]);
      setCategories(categoriesList);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      ...initialFormData,
      level: Math.max(...rules.map(r => r.level), 0) + 1
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (rule: EscalationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      category_id: rule.category_id || '',
      priority: (rule as { priority?: TicketPriority }).priority || 'all',
      level: rule.level,
      trigger_after_hours: rule.trigger_after_hours,
      notify_email: (rule as { notify_email?: boolean }).notify_email ?? true,
      notify_in_app: (rule as { notify_in_app?: boolean }).notify_in_app ?? true,
      is_active: rule.is_active
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError('Please provide a rule name');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const ruleData = {
        name: formData.name,
        category_id: formData.category_id || null,
        priority: formData.priority === 'all' ? null : formData.priority,
        level: formData.level,
        trigger_after_hours: formData.trigger_after_hours,
        notify_email: formData.notify_email,
        notify_in_app: formData.notify_in_app,
        is_active: formData.is_active
      };

      if (editingRule) {
        const { error: updateError } = await supabase
          .from('escalation_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('escalation_rules')
          .insert([ruleData]);

        if (insertError) throw insertError;
      }

      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleStatus = async (rule: EscalationRule) => {
    try {
      const { error: updateError } = await supabase
        .from('escalation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Failed to update rule status:', err);
    }
  };

  const handleDelete = async (rule: EscalationRule) => {
    const ruleName = (rule as { name?: string }).name || `Level ${rule.level}`;
    if (!confirm(`Are you sure you want to delete "${ruleName}"?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from('escalation_rules')
        .delete()
        .eq('id', rule.id);

      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const activeRules = rules.filter(r => r.is_active).length;
  const maxLevel = Math.max(...rules.map(r => r.level), 0);

  const groupedByLevel = rules.reduce((acc, rule) => {
    if (!acc[rule.level]) acc[rule.level] = [];
    acc[rule.level].push(rule);
    return acc;
  }, {} as Record<number, RuleWithCategory[]>);

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
          <h1 className="text-2xl font-bold text-gray-900">Escalation Rules</h1>
          <p className="text-gray-500 mt-1">Configure automatic ticket escalation when SLA is at risk</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
              <p className="text-sm text-gray-500">Total Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeRules}</p>
              <p className="text-sm text-gray-500">Active Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{maxLevel}</p>
              <p className="text-sm text-gray-500">Escalation Levels</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rules.filter(r => (r as { notify_email?: boolean }).notify_email).length}</p>
              <p className="text-sm text-gray-500">Email Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No escalation rules configured</p>
          <p className="text-sm text-gray-400 mb-4">
            Escalation rules automatically notify supervisors when tickets are at risk of breaching SLA
          </p>
          <button
            onClick={openCreateModal}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByLevel)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, levelRules]) => (
              <div key={level} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      Number(level) === 1 ? 'bg-amber-100' : Number(level) === 2 ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      <span className={`font-bold ${
                        Number(level) === 1 ? 'text-amber-600' : Number(level) === 2 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        L{level}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Level {level} Escalation</h2>
                      <p className="text-sm text-gray-500">{levelRules.length} rule(s) configured</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {levelRules.map((rule) => {
                    const priority = (rule as { priority?: TicketPriority }).priority;
                    const pConfig = priorityConfig[priority || 'all'];
                    return (
                      <div key={rule.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="min-w-[200px]">
                            <p className="font-medium text-gray-900">
                              {(rule as { name?: string }).name || `Escalation Rule ${rule.level}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {rule.category?.name || 'All Categories'}
                              </span>
                              <ChevronRight className="w-3 h-3 text-gray-300" />
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pConfig.bgColor} ${pConfig.color}`}>
                                {pConfig.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 min-w-[150px]">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              After {formatSLATime(rule.trigger_after_hours)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(rule as { notify_email?: boolean }).notify_email && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                <Mail className="w-3 h-3" />
                                Email
                              </span>
                            )}
                            {(rule as { notify_in_app?: boolean }).notify_in_app && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                                <Bell className="w-3 h-3" />
                                In-App
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {rule.is_active ? (
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
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit rule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleRuleStatus(rule)}
                            className={`p-1.5 rounded transition-colors ${
                              rule.is_active
                                ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={rule.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {rule.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>How Escalation Works:</strong> When a ticket approaches its SLA deadline,
          the system automatically notifies designated supervisors based on escalation level.
          Level 1 is triggered first, followed by Level 2 if the issue remains unresolved.
          Higher levels typically involve senior management for critical issues.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRule ? 'Edit Escalation Rule' : 'Add Escalation Rule'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingRule ? 'Update escalation rule settings' : 'Configure when and how tickets should escalate'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Critical Ticket - 4 Hour Warning"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority | 'all' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escalation Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Level 1 - Initial</option>
                    <option value={2}>Level 2 - Manager</option>
                    <option value={3}>Level 3 - Senior Management</option>
                    <option value={4}>Level 4 - Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger After (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.trigger_after_hours}
                    onChange={(e) => setFormData({ ...formData, trigger_after_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0.5}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notification Methods
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notify_email}
                      onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Email Notification</p>
                      <p className="text-xs text-gray-500">Send email to supervisors</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notify_in_app}
                      onChange={(e) => setFormData({ ...formData, notify_in_app: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Bell className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">In-App Notification</p>
                      <p className="text-xs text-gray-500">Show alert in dashboard</p>
                    </div>
                  </label>
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
                  <p className="text-xs text-gray-500">This rule is currently enabled</p>
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
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
