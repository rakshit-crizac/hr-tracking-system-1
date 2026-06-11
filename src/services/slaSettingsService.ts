import { supabase } from '../lib/supabase';
import { SLASettings, SLAStatus, Ticket } from '../types';

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

const settingKeyMap: Record<keyof SLASettings, string> = {
  warning_threshold_percent: 'sla_warning_threshold_percent',
  critical_threshold_percent: 'sla_critical_threshold_percent',
  reopen_window_hours: 'reopen_window_hours',
  reopened_sla_reduction_percent: 'reopened_sla_reduction_percent',
  auto_close_resolved_after_hours: 'auto_close_resolved_after_hours',
  auto_close_days: 'auto_close_days',
  waiting_for_employee_pauses_sla: 'waiting_for_employee_pauses_sla',
  internal_review_pauses_sla: 'internal_review_pauses_sla',
  sla_pause_on_external_dependency: 'sla_pause_on_external_dependency',
  sla_pause_on_approval: 'sla_pause_on_approval',
  enable_auto_escalation: 'enable_auto_escalation',
  escalation_level_1_percent: 'escalation_level_1_percent',
  escalation_level_2_percent: 'escalation_level_2_percent',
  require_breach_reason: 'require_breach_reason',
  auto_tag_breached_tickets: 'auto_tag_breached_tickets',
  separate_breached_queue: 'separate_breached_queue',
  apply_sla_to_all_categories: 'apply_sla_to_all_categories',
  allow_category_sla_override: 'allow_category_sla_override',
  enable_reopened_sla_logic: 'enable_reopened_sla_logic',
};

let cachedSettings: SLASettings | null = null;

export async function loadSLASettings(): Promise<SLASettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to load SLA settings:', error);
    return { ...DEFAULT_SETTINGS };
  }

  const settings: SLASettings = { ...DEFAULT_SETTINGS };

  const dbKeyToSettingKey: Record<string, keyof SLASettings> = {};
  for (const [settingKey, dbKey] of Object.entries(settingKeyMap)) {
    dbKeyToSettingKey[dbKey] = settingKey as keyof SLASettings;
  }

  for (const row of data || []) {
    const settingKey = dbKeyToSettingKey[row.key];
    if (settingKey) {
      const rawValue = row.value;
      const defaultValue = DEFAULT_SETTINGS[settingKey];

      if (typeof defaultValue === 'boolean') {
        settings[settingKey] = rawValue === true || rawValue === 'true';
      } else if (typeof defaultValue === 'number') {
        const parsed = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
        settings[settingKey] = isNaN(parsed) ? defaultValue : parsed;
      }
    }
  }

  cachedSettings = settings;
  return settings;
}

export async function saveSLASettings(settings: Partial<SLASettings>): Promise<{ success: boolean; error?: string }> {
  try {
    for (const [key, value] of Object.entries(settings)) {
      const dbKey = settingKeyMap[key as keyof SLASettings];
      if (!dbKey) continue;

      const { error } = await supabase
        .from('system_settings')
        .update({
          value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('key', dbKey);

      if (error) throw error;
    }

    cachedSettings = null;
    return { success: true };
  } catch (err) {
    console.error('Failed to save SLA settings:', err);
    return { success: false, error: 'Failed to save settings' };
  }
}

export function getCachedSLASettings(): SLASettings | null {
  return cachedSettings;
}

export function calculateSLAConsumption(ticket: Ticket): number {
  if (!ticket.resolution_due_at) return 0;

  const now = new Date();
  const createdAt = new Date(ticket.created_at);
  const dueAt = new Date(ticket.resolution_due_at);

  const totalDuration = dueAt.getTime() - createdAt.getTime();
  if (totalDuration <= 0) return 100;

  let elapsed = now.getTime() - createdAt.getTime();

  if (ticket.sla_pause_duration_minutes > 0) {
    elapsed -= ticket.sla_pause_duration_minutes * 60 * 1000;
  }

  if (ticket.sla_paused_at) {
    return Math.min(100, (elapsed / totalDuration) * 100);
  }

  const consumption = (elapsed / totalDuration) * 100;
  return Math.min(100, Math.max(0, consumption));
}

export function getSLAStatus(ticket: Ticket, settings: SLASettings): SLAStatus {
  if (ticket.is_resolution_breached) {
    return 'breached';
  }

  const consumption = calculateSLAConsumption(ticket);

  if (consumption >= 100) {
    return 'breached';
  }

  if (consumption >= settings.critical_threshold_percent) {
    return 'critical';
  }

  if (consumption >= settings.warning_threshold_percent) {
    return 'warning';
  }

  return 'on_track';
}

export function getSLAStatusColor(status: SLAStatus): {
  bg: string;
  text: string;
  border: string;
  progressBar: string;
} {
  switch (status) {
    case 'on_track':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        progressBar: 'bg-green-500',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        progressBar: 'bg-amber-500',
      };
    case 'critical':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        progressBar: 'bg-red-500',
      };
    case 'breached':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        progressBar: 'bg-red-700',
      };
  }
}

export function shouldPauseSLA(status: string, settings: SLASettings): boolean {
  if (status === 'waiting_for_employee' && settings.waiting_for_employee_pauses_sla) {
    return true;
  }
  if (status === 'waiting_for_internal_review' && settings.internal_review_pauses_sla) {
    return true;
  }
  return false;
}

export function formatTimeRemaining(ticket: Ticket): string {
  if (!ticket.resolution_due_at) return 'No SLA';

  const now = new Date();
  const dueAt = new Date(ticket.resolution_due_at);

  let adjustedNow = now;
  if (ticket.sla_pause_duration_minutes > 0) {
    adjustedNow = new Date(now.getTime() - ticket.sla_pause_duration_minutes * 60 * 1000);
  }

  const diff = dueAt.getTime() - adjustedNow.getTime();

  if (diff <= 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m overdue`;
    }
    return `${minutes}m overdue`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

export function shouldTriggerEscalation(
  ticket: Ticket,
  settings: SLASettings
): { level1: boolean; level2: boolean } {
  if (!settings.enable_auto_escalation) {
    return { level1: false, level2: false };
  }

  const consumption = calculateSLAConsumption(ticket);

  return {
    level1: consumption >= settings.escalation_level_1_percent && ticket.escalation_level < 1,
    level2: consumption >= settings.escalation_level_2_percent && ticket.escalation_level < 2,
  };
}
