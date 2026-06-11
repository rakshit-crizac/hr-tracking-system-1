import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Holiday } from '../../types';
import { Calendar, Loader2, RefreshCw, Plus, CreditCard as Edit2, Trash2, Save, AlertCircle, Check, CalendarDays, CalendarCheck } from 'lucide-react';
import { format, isPast, parseISO, isThisYear, addYears } from 'date-fns';

interface HolidayFormData {
  name: string;
  holiday_date: string;
  is_recurring: boolean;
}

const initialFormData: HolidayFormData = {
  name: '',
  holiday_date: '',
  is_recurring: false
};

export function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date');

      if (fetchError) throw fetchError;
      setHolidays(data || []);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingHoliday(null);
    setFormData(initialFormData);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      holiday_date: holiday.holiday_date,
      is_recurring: holiday.is_recurring
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.holiday_date) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const holidayData = {
        name: formData.name,
        holiday_date: formData.holiday_date,
        is_recurring: formData.is_recurring
      };

      if (editingHoliday) {
        const { error: updateError } = await supabase
          .from('holidays')
          .update(holidayData)
          .eq('id', editingHoliday.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('holidays')
          .insert([holidayData]);

        if (insertError) throw insertError;
      }

      await loadHolidays();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save holiday:', err);
      setError(err instanceof Error ? err.message : 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holiday: Holiday) => {
    if (!confirm(`Are you sure you want to delete "${holiday.name}"?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holiday.id);

      if (deleteError) throw deleteError;
      await loadHolidays();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    }
  };

  const upcomingHolidays = holidays.filter(h => !isPast(parseISO(h.holiday_date)));
  const pastHolidays = holidays.filter(h => isPast(parseISO(h.holiday_date)));
  const thisYearHolidays = holidays.filter(h => isThisYear(parseISO(h.holiday_date)));
  const recurringCount = holidays.filter(h => h.is_recurring).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-gray-500 mt-1">Manage holidays that pause SLA calculations</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{holidays.length}</p>
              <p className="text-sm text-gray-500">Total Holidays</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingHolidays.length}</p>
              <p className="text-sm text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <CalendarDays className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{thisYearHolidays.length}</p>
              <p className="text-sm text-gray-500">This Year</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{recurringCount}</p>
              <p className="text-sm text-gray-500">Annual/Recurring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Upcoming Holidays</h2>
                <p className="text-sm text-gray-500">{upcomingHolidays.length} holidays</p>
              </div>
            </div>
          </div>

          {upcomingHolidays.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No upcoming holidays</p>
              <button
                onClick={openCreateModal}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add a holiday
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{holiday.name}</span>
                      {holiday.is_recurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          <RefreshCw className="w-3 h-3" />
                          Annual
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(parseISO(holiday.holiday_date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(holiday)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit holiday"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(holiday)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Past Holidays</h2>
              <p className="text-sm text-gray-500">{pastHolidays.length} holidays</p>
            </div>
          </div>

          {pastHolidays.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No past holidays</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {pastHolidays.reverse().map((holiday) => (
                <div key={holiday.id} className="px-6 py-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{holiday.name}</span>
                      {holiday.is_recurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          <RefreshCw className="w-3 h-3" />
                          Annual
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(parseISO(holiday.holiday_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(holiday)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit holiday"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(holiday)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>How holidays affect SLA:</strong> On holidays, SLA timers are automatically paused.
          Recurring holidays will apply to the same date every year and are automatically renewed.
          Make sure to add all company holidays to ensure accurate SLA calculations.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingHoliday ? 'Update holiday details' : 'Add a new holiday to the calendar'}
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
                  Holiday Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Christmas Day"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.holiday_date}
                  onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Annual/Recurring Holiday</p>
                  <p className="text-sm text-gray-500">This holiday occurs every year on the same date</p>
                </div>
              </label>

              {formData.is_recurring && formData.holiday_date && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    Next occurrence: <span className="font-semibold">
                      {format(
                        isPast(parseISO(formData.holiday_date))
                          ? addYears(parseISO(formData.holiday_date), 1)
                          : parseISO(formData.holiday_date),
                        'MMMM d, yyyy'
                      )}
                    </span>
                  </p>
                </div>
              )}
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
                {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
