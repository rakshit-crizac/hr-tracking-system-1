import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Department, Category, AgentCategoryMapping } from '../../types';
import { Users, Search, Filter, Loader2, Shield, UserCog, Building2, Check, X, Plus, CreditCard as Edit2, Trash2, Save, AlertCircle, ChevronDown, ChevronUp, Tag } from 'lucide-react';

interface UserFormData {
  employee_code: string;
  email: string;
  full_name: string;
  department_id: string;
  is_hr_agent: boolean;
  is_admin: boolean;
  is_active: boolean;
  is_posh_handler: boolean;
}

const initialFormData: UserFormData = {
  employee_code: '',
  email: '',
  full_name: '',
  department_id: '',
  is_hr_agent: false,
  is_admin: false,
  is_active: true,
  is_posh_handler: false
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userMappings, setUserMappings] = useState<Record<string, AgentCategoryMapping[]>>({});
  const [savingMapping, setSavingMapping] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, deptRes, catRes] = await Promise.all([
        supabase.from('users').select('*, department:departments(*)').order('full_name'),
        supabase.from('departments').select('*').eq('is_active', true).order('name'),
        supabase.from('ticket_categories').select('*').eq('is_active', true).order('display_order')
      ]);

      setUsers((usersRes.data || []) as User[]);
      setDepartments(deptRes.data || []);
      setCategories(catRes.data || []);

      const hrAgents = (usersRes.data || []).filter((u: User) => u.is_hr_agent);
      if (hrAgents.length > 0) {
        const { data: mappings } = await supabase
          .from('agent_category_mappings')
          .select('*, category:ticket_categories(*)')
          .in('agent_id', hrAgents.map((a: User) => a.id));

        const mappingsByAgent: Record<string, AgentCategoryMapping[]> = {};
        (mappings || []).forEach((m: AgentCategoryMapping) => {
          if (!mappingsByAgent[m.agent_id]) {
            mappingsByAgent[m.agent_id] = [];
          }
          mappingsByAgent[m.agent_id].push(m);
        });
        setUserMappings(mappingsByAgent);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.employee_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && user.is_admin) ||
      (roleFilter === 'hr_agent' && user.is_hr_agent && !user.is_admin) ||
      (roleFilter === 'employee' && !user.is_hr_agent && !user.is_admin);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      employee_code: user.employee_code,
      email: user.email,
      full_name: user.full_name,
      department_id: user.department_id || '',
      is_hr_agent: user.is_hr_agent,
      is_admin: user.is_admin,
      is_active: user.is_active,
      is_posh_handler: user.is_posh_handler
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.employee_code || !formData.email || !formData.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const userData = {
        employee_code: formData.employee_code.toUpperCase(),
        email: formData.email.toLowerCase(),
        full_name: formData.full_name,
        department_id: formData.department_id || null,
        is_hr_agent: formData.is_hr_agent,
        is_admin: formData.is_admin,
        is_active: formData.is_active,
        is_posh_handler: formData.is_posh_handler,
        role: formData.is_admin ? 'admin' : formData.is_hr_agent ? 'hr_agent' : 'employee'
      };

      if (editingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert([userData]);

        if (insertError) throw insertError;
      }

      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (updateError) throw updateError;
      await loadData();
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const toggleCategoryMapping = async (agentId: string, categoryId: string, currentMapping?: AgentCategoryMapping) => {
    setSavingMapping(true);
    try {
      if (currentMapping) {
        const { error: updateError } = await supabase
          .from('agent_category_mappings')
          .update({ is_active: !currentMapping.is_active })
          .eq('id', currentMapping.id);

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
      setSavingMapping(false);
    }
  };

  const toggleExpandUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system users, roles, and HR agent category assignments</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.is_active).length}</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <UserCog className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.is_hr_agent).length}</p>
              <p className="text-sm text-gray-500">HR Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.is_admin).length}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or employee code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="hr_agent">HR Agents</option>
                <option value="employee">Employees</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div key={user.id}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-white">
                          {user.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{user.full_name}</p>
                          {!user.is_active && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs font-mono text-gray-400">{user.employee_code}</span>
                          {user.department && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Building2 className="w-3 h-3" />
                              {user.department.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {user.is_admin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {user.is_hr_agent && !user.is_admin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            <UserCog className="w-3 h-3" />
                            HR Agent
                          </span>
                        )}
                        {!user.is_hr_agent && !user.is_admin && (
                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            Employee
                          </span>
                        )}
                        {user.is_posh_handler && (
                          <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            POSH
                          </span>
                        )}
                      </div>

                      {user.is_hr_agent && (
                        <button
                          onClick={() => toggleExpandUser(user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Manage category mappings"
                        >
                          {expandedUser === user.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.is_active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedUser === user.id && user.is_hr_agent && (
                  <div className="px-4 pb-4">
                    <div className="ml-16 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium text-gray-700">Category Mappings</h4>
                        {savingMapping && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Select the categories this agent can handle tickets for:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => {
                          const mapping = userMappings[user.id]?.find(m => m.category_id === category.id);
                          const isActive = mapping?.is_active ?? false;
                          return (
                            <button
                              key={category.id}
                              onClick={() => toggleCategoryMapping(user.id, category.id, mapping)}
                              disabled={savingMapping}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                              }`}
                            >
                              {category.name}
                              {isActive && <Check className="w-3 h-3 ml-1 inline" />}
                            </button>
                          );
                        })}
                      </div>
                      {userMappings[user.id]?.filter(m => m.is_active).length === 0 && (
                        <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          No categories assigned - this agent won't receive any tickets
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingUser ? 'Update user information and permissions' : 'Create a new user account'}
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
                    Employee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_hr_agent}
                      onChange={(e) => setFormData({ ...formData, is_hr_agent: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">HR Agent</p>
                      <p className="text-xs text-gray-500">Can handle and resolve tickets</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Administrator</p>
                      <p className="text-xs text-gray-500">Full system access and configuration</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_posh_handler}
                      onChange={(e) => setFormData({ ...formData, is_posh_handler: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">POSH Handler</p>
                      <p className="text-xs text-gray-500">Can handle sensitive POSH-related tickets</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Active</p>
                      <p className="text-xs text-gray-500">User can log in and use the system</p>
                    </div>
                  </label>
                </div>
              </div>
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
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
