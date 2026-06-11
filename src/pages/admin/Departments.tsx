import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Department } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Building2,
  Loader2,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Save,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

interface DepartmentForm {
  name: string;
  code: string;
  is_active: boolean;
}

const initialForm: DepartmentForm = {
  name: '',
  code: '',
  is_active: true,
};

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentForm>(initialForm);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openAddModal = () => {
    setForm(initialForm);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setForm({
      name: dept.name,
      code: dept.code,
      is_active: dept.is_active,
    });
    setEditingId(dept.id);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Department name is required');
      return;
    }

    if (!form.code.trim()) {
      setError('Department code is required');
      return;
    }

    const codeExists = departments.some(
      (d) => d.code.toLowerCase() === form.code.toLowerCase() && d.id !== editingId
    );
    if (codeExists) {
      setError('A department with this code already exists');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('departments')
          .update({
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        showSuccess('Department updated successfully');
      } else {
        const { error: insertError } = await supabase.from('departments').insert({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          is_active: form.is_active,
        });

        if (insertError) throw insertError;
        showSuccess('Department created successfully');
      }

      await loadDepartments();
      closeModal();
    } catch (err) {
      console.error('Failed to save department:', err);
      setError('Failed to save department. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('departments').delete().eq('id', id);

      if (deleteError) throw deleteError;
      showSuccess('Department deleted successfully');
      await loadDepartments();
    } catch (err) {
      console.error('Failed to delete department:', err);
      setError('Failed to delete department. It may have associated users.');
    } finally {
      setSaving(false);
      setDeleteConfirm(null);
    }
  };

  const toggleStatus = async (dept: Department) => {
    try {
      const { error: updateError } = await supabase
        .from('departments')
        .update({
          is_active: !dept.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dept.id);

      if (updateError) throw updateError;
      showSuccess(`Department ${dept.is_active ? 'deactivated' : 'activated'} successfully`);
      await loadDepartments();
    } catch (err) {
      console.error('Failed to toggle department status:', err);
      setError('Failed to update department status');
    }
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        title="Departments"
        subtitle="Manage company departments and their status"
        breadcrumbs={[{ label: 'Settings', href: '/admin/settings' }, { label: 'Departments' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadDepartments}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>
        }
      />

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {error && !showModal && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-sm text-gray-500">Total Departments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {departments.filter((d) => d.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {departments.filter((d) => !d.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredDepartments.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No departments match your search' : 'No departments found'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add your first department
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
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
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(dept)}
                        className="focus:outline-none"
                        title={dept.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {dept.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded hover:bg-gray-200 transition-colors">
                            <X className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(dept)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === dept.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(dept.id)}
                              disabled={saving}
                              className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(dept.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Department' : 'Add Department'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingId ? 'Update department details' : 'Create a new department'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Human Resources"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., HR"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Short unique identifier (max 10 characters)
                  </p>
                </div>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Active</p>
                    <p className="text-sm text-gray-500">Department is available for selection</p>
                  </div>
                </label>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
