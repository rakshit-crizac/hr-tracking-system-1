import { useEffect, useState, useCallback } from 'react';
import { BusinessHours as BusinessHoursType, BusinessHoursConfig, Holiday, SLAPreviewResult } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Clock,
  Loader2,
  Check,
  X,
  Pencil,
  Save,
  AlertCircle,
  Sun,
  Moon,
  RefreshCw,
  Globe,
  Timer,
  Calendar,
  Coffee,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  fetchBusinessHours,
  fetchBusinessHoursConfig,
  updateBusinessHoursConfig,
  updateBusinessHour,
  fetchHolidays,
  calculateSLADeadline,
  calculateTotalWeeklyHours,
  getWorkingDaysCount,
  validateBusinessHoursConfig,
  getDefaultConfig,
  TIMEZONE_OPTIONS,
  DAY_NAMES,
} from '../../services/slaConfigService';
import { Link } from 'react-router-dom';

interface EditingDay {
  id: string;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
}

export function BusinessHours() {
  const [hours, setHours] = useState<BusinessHoursType[]>([]);
  const [config, setConfig] = useState<BusinessHoursConfig | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<EditingDay | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false);
  const [pendingTimezone, setPendingTimezone] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [previewDate, setPreviewDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [previewSLAHours, setPreviewSLAHours] = useState<number>(8);
  const [previewResult, setPreviewResult] = useState<SLAPreviewResult | null>(null);
  const [showPreviewBreakdown, setShowPreviewBreakdown] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hoursData, configData, holidaysData] = await Promise.all([
        fetchBusinessHours(),
        fetchBusinessHoursConfig(),
        fetchHolidays(),
      ]);
      setHours(hoursData);
      setConfig(configData || (getDefaultConfig() as BusinessHoursConfig));
      setHolidays(holidaysData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (hours.length > 0 && config) {
      const validation = validateBusinessHoursConfig(hours, config);
      setValidationErrors(validation.errors);
    }
  }, [hours, config]);

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const calculateWorkingHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    const h = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  };

  const openEdit = (day: BusinessHoursType) => {
    setEditingDay({
      id: day.id,
      is_working_day: day.is_working_day,
      start_time: day.start_time,
      end_time: day.end_time,
    });
    setError('');
  };

  const handleSaveDay = async () => {
    if (!editingDay) return;

    if (editingDay.is_working_day && editingDay.start_time >= editingDay.end_time) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError('');

    const result = await updateBusinessHour(editingDay.id, {
      is_working_day: editingDay.is_working_day,
      start_time: editingDay.start_time,
      end_time: editingDay.end_time,
    });

    if (result.success) {
      await loadData();
      setEditingDay(null);
      showSuccess('Schedule updated successfully');
    } else {
      setError(result.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleConfigChange = async (key: keyof BusinessHoursConfig, value: unknown) => {
    if (!config) return;

    if (key === 'timezone' && value !== config.timezone) {
      setPendingTimezone(value as string);
      setShowTimezoneWarning(true);
      return;
    }

    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);

    setSaving(true);
    const result = await updateBusinessHoursConfig({ [key]: value });
    if (!result.success) {
      setError(result.error || 'Failed to save configuration');
      setConfig(config);
    } else {
      showSuccess('Configuration saved');
    }
    setSaving(false);
  };

  const confirmTimezoneChange = async () => {
    if (!pendingTimezone || !config) return;

    setConfig({ ...config, timezone: pendingTimezone });
    setSaving(true);
    const result = await updateBusinessHoursConfig({ timezone: pendingTimezone });
    if (!result.success) {
      setError(result.error || 'Failed to save timezone');
    } else {
      showSuccess('Timezone updated');
    }
    setSaving(false);
    setShowTimezoneWarning(false);
    setPendingTimezone(null);
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Reset all settings to default? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    const defaultConfig = getDefaultConfig();
    const result = await updateBusinessHoursConfig(defaultConfig as Partial<BusinessHoursConfig>);
    if (result.success) {
      await loadData();
      showSuccess('Reset to default settings');
    } else {
      setError(result.error || 'Failed to reset');
    }
    setSaving(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const runSLAPreview = () => {
    if (!config || hours.length === 0) return;

    const ticketDate = new Date(previewDate);
    const result = calculateSLADeadline(ticketDate, previewSLAHours, hours, config, holidays);
    setPreviewResult(result);
    setShowPreviewBreakdown(true);
  };

  const workingDays = getWorkingDaysCount(hours);
  const totalWeeklyMinutes = calculateTotalWeeklyHours(hours);
  const totalWeeklyHours = Math.floor(totalWeeklyMinutes / 60);
  const totalWeeklyMins = totalWeeklyMinutes % 60;

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
        title="Business Hours & SLA Configuration"
        subtitle="Configure working hours, timezone, and SLA calculation rules"
        breadcrumbs={[{ label: 'Settings', href: '/admin/settings' }, { label: 'Business Hours' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
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

      {validationErrors.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            Configuration Warnings
          </div>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{workingDays}</p>
              <p className="text-sm text-gray-500">Working Days/Week</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Sun className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalWeeklyHours}h {totalWeeklyMins > 0 && `${totalWeeklyMins}m`}
              </p>
              <p className="text-sm text-gray-500">Weekly Hours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Moon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{7 - workingDays}</p>
              <p className="text-sm text-gray-500">Off Days/Week</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Globe className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 truncate">
                {TIMEZONE_OPTIONS.find(tz => tz.value === config?.timezone)?.offset || 'UTC'}
              </p>
              <p className="text-sm text-gray-500">{config?.timezone?.split('/')[1] || 'Timezone'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Weekly Schedule</h2>
                <p className="text-sm text-gray-500">Configure working days and hours</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {hours.map((day) => (
              <div
                key={day.id}
                className={`px-6 py-3 flex items-center justify-between transition-colors ${
                  !day.is_working_day ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <span className={`font-medium ${day.is_working_day ? 'text-gray-900' : 'text-gray-400'}`}>
                      {DAY_NAMES[day.day_of_week]}
                    </span>
                  </div>
                  {day.is_working_day ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <Check className="w-3 h-3" />
                      Working
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                      <X className="w-3 h-3" />
                      Off
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {day.is_working_day && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-900 font-medium">
                        {formatTime(day.start_time)} - {formatTime(day.end_time)}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                        {calculateWorkingHours(day.start_time, day.end_time)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => openEdit(day)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Time Settings</h2>
                  <p className="text-sm text-gray-500">Timezone and cutoff configuration</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Timezone
                </label>
                <select
                  value={config?.timezone || 'UTC'}
                  onChange={(e) => handleConfigChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">All SLA calculations use this timezone</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily SLA Cutoff Time
                </label>
                <input
                  type="time"
                  value={config?.cutoff_time || '17:00'}
                  onChange={(e) => handleConfigChange('cutoff_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tickets created after this time start SLA counting next working day
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">SLA Rules</h2>
                  <p className="text-sm text-gray-500">How SLA timers behave</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Exclude Non-Working Days</p>
                  <p className="text-xs text-gray-500">SLA pauses on weekends and holidays</p>
                </div>
                <input
                  type="checkbox"
                  checked={config?.exclude_non_working_days ?? true}
                  onChange={(e) => handleConfigChange('exclude_non_working_days', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Holiday Calendar</p>
                  <p className="text-xs text-gray-500">{holidays.length} holidays configured</p>
                </div>
                <Link
                  to="/admin/holidays"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-gray-900">Advanced Settings</h2>
              <p className="text-sm text-gray-500">Break time configuration</p>
            </div>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-4">
              <div>
                <p className="font-medium text-gray-900 text-sm">Enable Break Time</p>
                <p className="text-xs text-gray-500">SLA pauses during break hours</p>
              </div>
              <input
                type="checkbox"
                checked={config?.break_enabled ?? false}
                onChange={(e) => handleConfigChange('break_enabled', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>

            {config?.break_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Start
                  </label>
                  <input
                    type="time"
                    value={config.break_start || '13:00'}
                    onChange={(e) => handleConfigChange('break_start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break End
                  </label>
                  <input
                    type="time"
                    value={config.break_end || '14:00'}
                    onChange={(e) => handleConfigChange('break_end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">SLA Preview Simulator</h2>
              <p className="text-sm text-gray-500">Test SLA calculation with your configuration</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Created Date & Time
              </label>
              <input
                type="datetime-local"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SLA Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={previewSLAHours}
                onChange={(e) => setPreviewSLAHours(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runSLAPreview}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calculate Deadline
              </button>
            </div>
          </div>

          {previewResult && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Calculated SLA Deadline</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {previewResult.deadline.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-lg text-blue-800">
                    {previewResult.deadline.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">Working Days Used</p>
                  <p className="text-xl font-bold text-blue-900">{previewResult.workingDaysUsed}</p>
                </div>
              </div>

              {previewResult.holidaysSkipped.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium">Holidays Skipped:</p>
                  <p className="text-sm text-amber-700">{previewResult.holidaysSkipped.join(', ')}</p>
                </div>
              )}

              <button
                onClick={() => setShowPreviewBreakdown(!showPreviewBreakdown)}
                className="text-sm text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                {showPreviewBreakdown ? 'Hide' : 'Show'} detailed breakdown
                {showPreviewBreakdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showPreviewBreakdown && (
                <div className="mt-4 space-y-2">
                  {previewResult.breakdown.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        step.isHoliday
                          ? 'bg-amber-100 border border-amber-200'
                          : step.minutesUsed === 0
                          ? 'bg-gray-100 border border-gray-200'
                          : 'bg-white border border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {step.dayName}, {step.date}
                        </span>
                        {step.minutesUsed > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {step.hoursUsed}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{step.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How SLA Calculation Works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>SLA timers only count during configured business hours</li>
              <li>Weekends and holidays are excluded when enabled</li>
              <li>Tickets created after cutoff time start SLA next working day</li>
              <li>The "Waiting for Employee" status pauses SLA timers</li>
              <li>Changes apply to new tickets only, not active tickets</li>
            </ul>
          </div>
        </div>
      </div>

      {editingDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Edit {DAY_NAMES[hours.find((h) => h.id === editingDay.id)?.day_of_week ?? 0]}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Configure working hours for this day</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={editingDay.is_working_day}
                  onChange={(e) => setEditingDay({ ...editingDay, is_working_day: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Working Day</p>
                  <p className="text-sm text-gray-500">SLA timers will count on this day</p>
                </div>
              </label>

              {editingDay.is_working_day && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editingDay.start_time}
                      onChange={(e) => setEditingDay({ ...editingDay, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={editingDay.end_time}
                      onChange={(e) => setEditingDay({ ...editingDay, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {editingDay.is_working_day &&
                editingDay.start_time &&
                editingDay.end_time &&
                editingDay.start_time < editingDay.end_time && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-blue-700">
                      Working hours:{' '}
                      <span className="font-semibold">
                        {calculateWorkingHours(editingDay.start_time, editingDay.end_time)}
                      </span>
                    </p>
                  </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingDay(null);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDay}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimezoneWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Change Timezone?</h3>
                <p className="text-sm text-gray-500">This affects SLA calculations</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Changing the timezone will impact all SLA calculations going forward. Existing ticket
              deadlines will remain unchanged, but new tickets and SLA recalculations will use the new
              timezone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTimezoneWarning(false);
                  setPendingTimezone(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmTimezoneChange}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
