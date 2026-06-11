import { useEffect, useState, useMemo, useCallback } from 'react';
import { SLASettings } from '../../types';
import { loadSLASettings, saveSLASettings } from '../../services/slaSettingsService';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  Loader2,
  Save,
  Info,
  Clock,
  AlertTriangle,
  Timer,
  RefreshCw,
  CheckCircle,
  Shield,
  Gauge,
  RotateCcw,
  X,
  AlertCircle,
  Zap,
  Lock,
  Tag,
  Layers,
  Settings2,
  ArrowUpCircle,
  FileWarning,
  ToggleLeft,
} from 'lucide-react';

interface ValidationErrors {
  [key: string]: string;
}

const DEFAULT_SETTINGS: SLASettings = {
  warning_threshold_percent: 75,
  critical_threshold_percent: 90,
  reopen_window_hours: 48,
  reopened_sla_reduction_percent: 50,
  auto_close_resolved_after_hours: 72,
  auto_close_days: 3,
  waiting_for_employee_pauses_sla: true,
  internal_review_pauses_sla: false,
  sla_pause_on_external_dependency: false,
  sla_pause_on_approval: false,
  enable_auto_escalation: true,
  escalation_level_1_percent: 90,
  escalation_level_2_percent: 100,
  require_breach_reason: false,
  auto_tag_breached_tickets: true,
  separate_breached_queue: true,
  apply_sla_to_all_categories: true,
  allow_category_sla_override: true,
  enable_reopened_sla_logic: true,
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  unit,
  error,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            unit ? 'pr-12' : 'pr-3'
          } ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {min !== undefined && max !== undefined && !error && (
        <p className="mt-1 text-xs text-gray-400">
          Range: {min} - {max}
        </p>
      )}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  modified,
}: {
  icon: typeof Clock;
  label: string;
  description: string;
  children: React.ReactNode;
  modified?: boolean;
}) {
  return (
    <div className="px-6 py-5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-2 bg-gray-100 rounded-lg mt-0.5">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <label className="font-medium text-gray-900 block mb-1">
              {label}
              {modified && (
                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Modified
                </span>
              )}
            </label>
            <p className="text-sm text-gray-500 flex items-start gap-1.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
              {description}
            </p>
          </div>
        </div>
        <div className="w-56 flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  bgColor,
  iconBg,
  iconColor,
  children,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 border-b border-gray-200 ${bgColor}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

export function Settings() {
  const [settings, setSettings] = useState<SLASettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SLASettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await loadSLASettings();
      setSettings(loaded);
      setOriginalSettings(loaded);
      setValidationErrors({});
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const hasChanges = useMemo(() => {
    return Object.keys(settings).some(
      (key) =>
        settings[key as keyof SLASettings] !== originalSettings[key as keyof SLASettings]
    );
  }, [settings, originalSettings]);

  const isModified = useCallback(
    (key: keyof SLASettings) => {
      return settings[key] !== originalSettings[key];
    },
    [settings, originalSettings]
  );

  const validate = useCallback((newSettings: SLASettings): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (newSettings.warning_threshold_percent < 1 || newSettings.warning_threshold_percent > 99) {
      errors.warning_threshold_percent = 'Must be between 1 and 99';
    }

    if (newSettings.critical_threshold_percent < 1 || newSettings.critical_threshold_percent > 100) {
      errors.critical_threshold_percent = 'Must be between 1 and 100';
    }

    if (newSettings.warning_threshold_percent >= newSettings.critical_threshold_percent) {
      errors.warning_threshold_percent = 'Warning must be less than critical threshold';
    }

    if (newSettings.reopen_window_hours < 1 || newSettings.reopen_window_hours > 720) {
      errors.reopen_window_hours = 'Must be between 1 and 720 hours';
    }

    if (newSettings.reopened_sla_reduction_percent < 0 || newSettings.reopened_sla_reduction_percent > 100) {
      errors.reopened_sla_reduction_percent = 'Must be between 0 and 100';
    }

    if (newSettings.auto_close_days < 1 || newSettings.auto_close_days > 30) {
      errors.auto_close_days = 'Must be between 1 and 30 days';
    }

    if (newSettings.escalation_level_1_percent < 50 || newSettings.escalation_level_1_percent > 100) {
      errors.escalation_level_1_percent = 'Must be between 50 and 100';
    }

    if (newSettings.escalation_level_2_percent < 50 || newSettings.escalation_level_2_percent > 150) {
      errors.escalation_level_2_percent = 'Must be between 50 and 150';
    }

    if (newSettings.escalation_level_1_percent >= newSettings.escalation_level_2_percent) {
      errors.escalation_level_1_percent = 'Level 1 must be less than Level 2';
    }

    return errors;
  }, []);

  const updateSetting = useCallback(
    <K extends keyof SLASettings>(key: K, value: SLASettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      setValidationErrors(validate(newSettings));
      setSaveSuccess(false);
    },
    [settings, validate]
  );

  const handleReset = useCallback(() => {
    setSettings({ ...originalSettings });
    setValidationErrors({});
    setSaveSuccess(false);
  }, [originalSettings]);

  const handleSave = useCallback(async () => {
    const errors = validate(settings);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const changedSettings: Partial<SLASettings> = {};
      for (const key of Object.keys(settings) as Array<keyof SLASettings>) {
        if (settings[key] !== originalSettings[key]) {
          (changedSettings as Record<string, unknown>)[key] = settings[key];
        }
      }

      const result = await saveSLASettings(changedSettings);
      if (!result.success) {
        throw new Error(result.error);
      }

      setOriginalSettings({ ...settings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [settings, originalSettings, validate]);

  const pauseTriggerCount = useMemo(() => {
    let count = 0;
    if (settings.waiting_for_employee_pauses_sla) count++;
    if (settings.internal_review_pauses_sla) count++;
    if (settings.sla_pause_on_external_dependency) count++;
    if (settings.sla_pause_on_approval) count++;
    return count;
  }, [settings]);

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
        title="SLA Behavior Control Center"
        subtitle="Configure how SLA timers behave, how breaches are detected, and system-wide rules"
        breadcrumbs={[{ label: 'Admin' }, { label: 'SLA Settings' }]}
        actions={
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Saved</span>
              </div>
            )}
            <button
              onClick={loadSettings}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {hasChanges && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || Object.keys(validationErrors).length > 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {settings.warning_threshold_percent}%
              </p>
              <p className="text-sm text-gray-500">Warning Threshold</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Gauge className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {settings.critical_threshold_percent}%
              </p>
              <p className="text-sm text-gray-500">Critical Threshold</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{settings.reopen_window_hours}h</p>
              <p className="text-sm text-gray-500">Reopen Window</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pauseTriggerCount}</p>
              <p className="text-sm text-gray-500">SLA Pause Triggers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Gauge className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-2">SLA Progress Preview</h3>
            <p className="text-sm text-blue-700 mb-3">
              Visual representation of how tickets will be color-coded based on SLA consumption
            </p>
            <div className="h-6 bg-white rounded-full overflow-hidden border border-blue-200 relative">
              <div
                className="absolute h-full bg-green-400 transition-all duration-300"
                style={{ width: `${settings.warning_threshold_percent}%` }}
              />
              <div
                className="absolute h-full bg-amber-400 transition-all duration-300"
                style={{
                  left: `${settings.warning_threshold_percent}%`,
                  width: `${settings.critical_threshold_percent - settings.warning_threshold_percent}%`,
                }}
              />
              <div
                className="absolute h-full bg-red-400 transition-all duration-300"
                style={{
                  left: `${settings.critical_threshold_percent}%`,
                  width: `${100 - settings.critical_threshold_percent}%`,
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
                style={{ left: `${settings.escalation_level_1_percent}%` }}
                title={`Escalation Level 1 at ${settings.escalation_level_1_percent}%`}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-800"
                style={{ left: `${Math.min(settings.escalation_level_2_percent, 100)}%` }}
                title={`Escalation Level 2 at ${settings.escalation_level_2_percent}%`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-green-700 font-medium">
                On Track (0-{settings.warning_threshold_percent}%)
              </span>
              <span className="text-amber-700 font-medium">
                Warning ({settings.warning_threshold_percent}-{settings.critical_threshold_percent}%)
              </span>
              <span className="text-red-700 font-medium">
                Critical ({settings.critical_threshold_percent}-100%)
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                <span className="text-gray-600">
                  Escalation L1 ({settings.escalation_level_1_percent}%)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-800 rounded-sm" />
                <span className="text-gray-600">
                  Escalation L2 ({settings.escalation_level_2_percent}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        icon={Gauge}
        title="SLA Thresholds"
        description="Define warning and critical thresholds for SLA monitoring"
        bgColor="bg-amber-50"
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
      >
        <SettingRow
          icon={AlertTriangle}
          label="Warning Threshold"
          description="Percentage of SLA time consumed before showing amber warning indicator"
          modified={isModified('warning_threshold_percent')}
        >
          <NumberInput
            value={settings.warning_threshold_percent}
            onChange={(v) => updateSetting('warning_threshold_percent', v)}
            min={1}
            max={99}
            unit="%"
            error={validationErrors.warning_threshold_percent}
          />
        </SettingRow>
        <SettingRow
          icon={Gauge}
          label="Critical Threshold"
          description="Percentage of SLA time consumed before showing red critical indicator"
          modified={isModified('critical_threshold_percent')}
        >
          <NumberInput
            value={settings.critical_threshold_percent}
            onChange={(v) => updateSetting('critical_threshold_percent', v)}
            min={1}
            max={100}
            unit="%"
            error={validationErrors.critical_threshold_percent}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={Clock}
        title="Reopen & Auto-Close"
        description="Configure ticket lifecycle after resolution"
        bgColor="bg-green-50"
        iconBg="bg-green-100"
        iconColor="text-green-600"
      >
        <SettingRow
          icon={RefreshCw}
          label="Reopen Window"
          description="Hours after resolution during which employees can reopen tickets"
          modified={isModified('reopen_window_hours')}
        >
          <NumberInput
            value={settings.reopen_window_hours}
            onChange={(v) => updateSetting('reopen_window_hours', v)}
            min={1}
            max={720}
            unit="hours"
            error={validationErrors.reopen_window_hours}
          />
        </SettingRow>
        <SettingRow
          icon={Lock}
          label="Auto-Close After"
          description="Days after resolved status before ticket automatically closes"
          modified={isModified('auto_close_days')}
        >
          <NumberInput
            value={settings.auto_close_days}
            onChange={(v) => updateSetting('auto_close_days', v)}
            min={1}
            max={30}
            unit="days"
            error={validationErrors.auto_close_days}
          />
        </SettingRow>
        <SettingRow
          icon={Timer}
          label="Reopened SLA Reduction"
          description="Percentage reduction in SLA time for reopened tickets (50% = half the original time)"
          modified={isModified('reopened_sla_reduction_percent')}
        >
          <NumberInput
            value={settings.reopened_sla_reduction_percent}
            onChange={(v) => updateSetting('reopened_sla_reduction_percent', v)}
            min={0}
            max={100}
            unit="%"
            error={validationErrors.reopened_sla_reduction_percent}
          />
        </SettingRow>
        <SettingRow
          icon={ToggleLeft}
          label="Enable Reopened SLA Logic"
          description="Apply reduced SLA times to reopened tickets"
          modified={isModified('enable_reopened_sla_logic')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.enable_reopened_sla_logic}
              onChange={(v) => updateSetting('enable_reopened_sla_logic', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.enable_reopened_sla_logic ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={Shield}
        title="SLA Pause Rules"
        description="Configure which statuses pause the SLA timer"
        bgColor="bg-blue-50"
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      >
        <SettingRow
          icon={Shield}
          label="Pause on Waiting for Employee"
          description="Pause SLA timer when ticket is waiting for employee response"
          modified={isModified('waiting_for_employee_pauses_sla')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.waiting_for_employee_pauses_sla}
              onChange={(v) => updateSetting('waiting_for_employee_pauses_sla', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.waiting_for_employee_pauses_sla ? 'Pauses SLA' : 'SLA continues'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Shield}
          label="Pause on External Dependency"
          description="Pause SLA timer when waiting for external party or vendor"
          modified={isModified('sla_pause_on_external_dependency')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.sla_pause_on_external_dependency}
              onChange={(v) => updateSetting('sla_pause_on_external_dependency', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.sla_pause_on_external_dependency ? 'Pauses SLA' : 'SLA continues'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Shield}
          label="Pause on Pending Approval"
          description="Pause SLA timer when ticket is pending management approval"
          modified={isModified('sla_pause_on_approval')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.sla_pause_on_approval}
              onChange={(v) => updateSetting('sla_pause_on_approval', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.sla_pause_on_approval ? 'Pauses SLA' : 'SLA continues'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Shield}
          label="Pause on Internal Review"
          description="Pause SLA timer during internal review processes"
          modified={isModified('internal_review_pauses_sla')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.internal_review_pauses_sla}
              onChange={(v) => updateSetting('internal_review_pauses_sla', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.internal_review_pauses_sla ? 'Pauses SLA' : 'SLA continues'}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={ArrowUpCircle}
        title="Escalation Behavior"
        description="Configure automatic escalation triggers"
        bgColor="bg-orange-50"
        iconBg="bg-orange-100"
        iconColor="text-orange-600"
      >
        <SettingRow
          icon={Zap}
          label="Enable Auto Escalation"
          description="Automatically escalate tickets when SLA thresholds are reached"
          modified={isModified('enable_auto_escalation')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.enable_auto_escalation}
              onChange={(v) => updateSetting('enable_auto_escalation', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.enable_auto_escalation ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={ArrowUpCircle}
          label="First Escalation Trigger"
          description="SLA consumption percentage to trigger first level escalation"
          modified={isModified('escalation_level_1_percent')}
        >
          <NumberInput
            value={settings.escalation_level_1_percent}
            onChange={(v) => updateSetting('escalation_level_1_percent', v)}
            min={50}
            max={100}
            unit="%"
            error={validationErrors.escalation_level_1_percent}
            disabled={!settings.enable_auto_escalation}
          />
        </SettingRow>
        <SettingRow
          icon={ArrowUpCircle}
          label="Second Escalation Trigger"
          description="SLA consumption percentage to trigger second level escalation (can exceed 100% for post-breach)"
          modified={isModified('escalation_level_2_percent')}
        >
          <NumberInput
            value={settings.escalation_level_2_percent}
            onChange={(v) => updateSetting('escalation_level_2_percent', v)}
            min={50}
            max={150}
            unit="%"
            error={validationErrors.escalation_level_2_percent}
            disabled={!settings.enable_auto_escalation}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={FileWarning}
        title="Breach Handling"
        description="Configure how SLA breaches are handled"
        bgColor="bg-red-50"
        iconBg="bg-red-100"
        iconColor="text-red-600"
      >
        <SettingRow
          icon={FileWarning}
          label="Require Breach Reason"
          description="Require agents to provide a reason when SLA is breached"
          modified={isModified('require_breach_reason')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.require_breach_reason}
              onChange={(v) => updateSetting('require_breach_reason', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.require_breach_reason ? 'Required' : 'Optional'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Tag}
          label="Auto-Tag Breached Tickets"
          description="Automatically add a breach tag to tickets that exceed SLA"
          modified={isModified('auto_tag_breached_tickets')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.auto_tag_breached_tickets}
              onChange={(v) => updateSetting('auto_tag_breached_tickets', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.auto_tag_breached_tickets ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Layers}
          label="Separate Breached Queue"
          description="Show breached tickets in a dedicated queue for prioritization"
          modified={isModified('separate_breached_queue')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.separate_breached_queue}
              onChange={(v) => updateSetting('separate_breached_queue', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.separate_breached_queue ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={Settings2}
        title="Global SLA Rules"
        description="System-wide SLA application settings"
        bgColor="bg-gray-50"
        iconBg="bg-gray-200"
        iconColor="text-gray-600"
      >
        <SettingRow
          icon={Layers}
          label="Apply SLA to All Categories"
          description="Enforce SLA policies across all ticket categories"
          modified={isModified('apply_sla_to_all_categories')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.apply_sla_to_all_categories}
              onChange={(v) => updateSetting('apply_sla_to_all_categories', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.apply_sla_to_all_categories ? 'All categories' : 'Selected only'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          icon={Settings2}
          label="Allow Category SLA Override"
          description="Allow individual categories to have their own SLA settings"
          modified={isModified('allow_category_sla_override')}
        >
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.allow_category_sla_override}
              onChange={(v) => updateSetting('allow_category_sla_override', v)}
            />
            <span className="text-sm text-gray-600">
              {settings.allow_category_sla_override ? 'Allowed' : 'Not allowed'}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Important Notice</p>
          <p className="text-sm text-amber-700 mt-1">
            Changes to these settings will affect all new tickets created after saving. Existing
            tickets will retain their original SLA configurations and won't be affected.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">How SLA Thresholds Work</p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Warning (Amber):</strong> Tickets will show amber indicator when SLA
              consumption reaches {settings.warning_threshold_percent}%
            </li>
            <li>
              <strong>Critical (Red):</strong> Tickets will show red indicator when SLA consumption
              reaches {settings.critical_threshold_percent}%
            </li>
            <li>
              <strong>Breached (Dark Red):</strong> Tickets will be marked as breached when SLA
              consumption exceeds 100%
            </li>
            <li>
              <strong>Escalation:</strong> Auto-escalation will trigger at{' '}
              {settings.escalation_level_1_percent}% (Level 1) and{' '}
              {settings.escalation_level_2_percent}% (Level 2)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
