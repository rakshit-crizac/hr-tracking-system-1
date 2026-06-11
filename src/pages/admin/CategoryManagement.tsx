import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Category, Subcategory } from '../../types';
import { FolderKanban, ChevronDown, ChevronRight, Shield, Loader2, Check, X, Plus, CreditCard as Edit2, Trash2, Save, AlertCircle, GripVertical, FolderTree } from 'lucide-react';

interface CategoryFormData {
  name: string;
  code: string;
  description: string;
  is_sensitive: boolean;
  is_active: boolean;
  display_order: number;
}

interface SubcategoryFormData {
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  code: '',
  description: '',
  is_sensitive: false,
  is_active: true,
  display_order: 0
};

const initialSubcategoryForm: SubcategoryFormData = {
  name: '',
  code: '',
  is_active: true,
  display_order: 0
};

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormData>(initialSubcategoryForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ticket_categories')
        .select('*, subcategories:ticket_subcategories(*)')
        .order('display_order');

      if (fetchError) throw fetchError;

      const categoriesWithSortedSubs = (data || []).map(cat => ({
        ...cat,
        subcategories: (cat.subcategories || []).sort((a: Subcategory, b: Subcategory) => a.display_order - b.display_order)
      }));

      setCategories(categoriesWithSortedSubs);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      ...initialCategoryForm,
      display_order: categories.length + 1
    });
    setError('');
    setShowCategoryModal(true);
  };

  const openEditCategory = (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      code: category.code,
      description: category.description || '',
      is_sensitive: category.is_sensitive,
      is_active: category.is_active,
      display_order: category.display_order
    });
    setError('');
    setShowCategoryModal(true);
  };

  const openCreateSubcategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategoryId(categoryId);
    setEditingSubcategory(null);
    const category = categories.find(c => c.id === categoryId);
    setSubcategoryForm({
      ...initialSubcategoryForm,
      display_order: (category?.subcategories?.length || 0) + 1
    });
    setError('');
    setShowSubcategoryModal(true);
  };

  const openEditSubcategory = (subcategory: Subcategory, categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      name: subcategory.name,
      code: subcategory.code,
      is_active: subcategory.is_active,
      display_order: subcategory.display_order
    });
    setError('');
    setShowSubcategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.code) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const categoryData = {
        name: categoryForm.name,
        code: categoryForm.code.toUpperCase(),
        description: categoryForm.description || null,
        is_sensitive: categoryForm.is_sensitive,
        is_active: categoryForm.is_active,
        display_order: categoryForm.display_order
      };

      if (editingCategory) {
        const { error: updateError } = await supabase
          .from('ticket_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ticket_categories')
          .insert([categoryData]);

        if (insertError) throw insertError;
      }

      await loadCategories();
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name || !subcategoryForm.code || !selectedCategoryId) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const subcategoryData = {
        category_id: selectedCategoryId,
        name: subcategoryForm.name,
        code: subcategoryForm.code.toUpperCase(),
        is_active: subcategoryForm.is_active,
        display_order: subcategoryForm.display_order
      };

      if (editingSubcategory) {
        const { error: updateError } = await supabase
          .from('ticket_subcategories')
          .update(subcategoryData)
          .eq('id', editingSubcategory.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ticket_subcategories')
          .insert([subcategoryData]);

        if (insertError) throw insertError;
      }

      await loadCategories();
      setShowSubcategoryModal(false);
    } catch (err) {
      console.error('Failed to save subcategory:', err);
      setError(err instanceof Error ? err.message : 'Failed to save subcategory');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryStatus = async (category: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error: updateError } = await supabase
        .from('ticket_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (updateError) throw updateError;
      await loadCategories();
    } catch (err) {
      console.error('Failed to update category status:', err);
    }
  };

  const toggleSubcategoryStatus = async (subcategory: Subcategory) => {
    try {
      const { error: updateError } = await supabase
        .from('ticket_subcategories')
        .update({ is_active: !subcategory.is_active })
        .eq('id', subcategory.id);

      if (updateError) throw updateError;
      await loadCategories();
    } catch (err) {
      console.error('Failed to update subcategory status:', err);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 mt-1">Manage HR ticket categories and subcategories</p>
        </div>
        <button
          onClick={openCreateCategory}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              <p className="text-sm text-gray-500">Total Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderTree className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Total Subcategories</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {categories.filter(c => c.is_sensitive).length}
              </p>
              <p className="text-sm text-gray-500">Sensitive Categories</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No categories found</p>
            <button
              onClick={openCreateCategory}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map((category) => (
              <div key={category.id}>
                <div
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(category.id)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <button className="p-1 hover:bg-gray-200 rounded">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      category.is_sensitive ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <FolderKanban className={`w-5 h-5 ${
                        category.is_sensitive ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{category.name}</span>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {category.code}
                        </span>
                        {category.is_sensitive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            <Shield className="w-3 h-3" />
                            Sensitive
                          </span>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {category.subcategories?.length || 0} subcategories
                    </span>
                    {category.is_active ? (
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
                      onClick={(e) => openCreateSubcategory(category.id, e)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Add subcategory"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => openEditCategory(category, e)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => toggleCategoryStatus(category, e)}
                      className={`p-2 rounded-lg transition-colors ${
                        category.is_active
                          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={category.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {category.is_active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedCategories.has(category.id) && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    {category.subcategories && category.subcategories.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="px-12 py-2 text-left font-medium">Subcategory</th>
                            <th className="px-6 py-2 text-left font-medium">Code</th>
                            <th className="px-6 py-2 text-left font-medium">Order</th>
                            <th className="px-6 py-2 text-left font-medium">Status</th>
                            <th className="px-6 py-2 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {category.subcategories.map((sub: Subcategory) => (
                            <tr key={sub.id} className="bg-white hover:bg-gray-50">
                              <td className="px-12 py-3">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3 h-3 text-gray-300" />
                                  <span className="text-sm text-gray-900">{sub.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {sub.code}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-sm text-gray-500">{sub.display_order}</span>
                              </td>
                              <td className="px-6 py-3">
                                {sub.is_active ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                    <Check className="w-3 h-3" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                                    <X className="w-3 h-3" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditSubcategory(sub, category.id)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit subcategory"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => toggleSubcategoryStatus(sub)}
                                    className={`p-1.5 rounded transition-colors ${
                                      sub.is_active
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title={sub.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {sub.is_active ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center">
                        <FolderTree className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 mb-2">No subcategories yet</p>
                        <button
                          onClick={(e) => openCreateSubcategory(category.id, e)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Add subcategory
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingCategory ? 'Update category details' : 'Create a new ticket category'}
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
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave Management"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="LEAVE"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description of this category..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_sensitive}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_sensitive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Sensitive Category</p>
                    <p className="text-xs text-gray-500">Requires special handler (POSH cases)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Active</p>
                    <p className="text-xs text-gray-500">Category is available for ticket creation</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubcategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingSubcategory ? 'Update subcategory details' : 'Create a new subcategory'}
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Annual Leave"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subcategoryForm.code}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="ANNUAL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={subcategoryForm.display_order}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={0}
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={subcategoryForm.is_active}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Subcategory is available for selection</p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSubcategoryModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubcategory}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
