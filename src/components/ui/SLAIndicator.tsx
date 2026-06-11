import { useMemo, useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Pause } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns';
import { SLASettings, SLAStatus, Ticket } from '../../types';
import { loadSLASettings, getCachedSLASettings } from '../../services/slaSettingsService';

interface SLAIndicatorProps {
  dueAt: string | null;
  completedAt?: string | null;
  createdAt?: string;
  isBreached: boolean;
  label?: string;
  showCountdown?: boolean;
  compact?: boolean;
  pausedAt?: string | null;
  pauseDurationMinutes?: number;
  showProgress?: boolean;
}

interface SLAIndicatorForTicketProps {
  ticket: Ticket;
  type?: 'acknowledgement' | 'resolution';
  compact?: boolean;
  showProgress?: boolean;
}

const DEFAULT_THRESHOLDS = {
  warning: 75,
  critical: 90,
};

function useSLASettings(): SLASettings | null {
  const [settings, setSettings] = useState<SLASettings | null>(getCachedSLASettings());

  useEffect(() => {
    if (!settings) {
      loadSLASettings().then(setSettings);
    }
  }, [settings]);

  return settings;
}

function calculateConsumption(
  dueAt: string,
  createdAt: string,
  pauseDurationMinutes: number = 0
): number {
  const now = new Date();
  const due = new Date(dueAt);
  const created = new Date(createdAt);

  const totalDuration = due.getTime() - created.getTime();
  if (totalDuration <= 0) return 100;

  let elapsed = now.getTime() - created.getTime();
  if (pauseDurationMinutes > 0) {
    elapsed -= pauseDurationMinutes * 60 * 1000;
  }

  const consumption = (elapsed / totalDuration) * 100;
  return Math.min(100, Math.max(0, consumption));
}

function getSLAStatusFromConsumption(
  consumption: number,
  isBreached: boolean,
  isPastDue: boolean,
  warningThreshold: number,
  criticalThreshold: number
): SLAStatus {
  if (isBreached || isPastDue || consumption >= 100) {
    return 'breached';
  }
  if (consumption >= criticalThreshold) {
    return 'critical';
  }
  if (consumption >= warningThreshold) {
    return 'warning';
  }
  return 'on_track';
}

function getStatusConfig(status: SLAStatus, timeText: string) {
  switch (status) {
    case 'on_track':
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        progressColor: 'bg-green-500',
        icon: Clock,
        text: timeText,
      };
    case 'warning':
      return {
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        progressColor: 'bg-amber-500',
        icon: AlertTriangle,
        text: timeText,
      };
    case 'critical':
      return {
        color: 'text-red-600 bg-red-50 border-red-200',
        progressColor: 'bg-red-500',
        icon: AlertTriangle,
        text: timeText,
      };
    case 'breached':
      return {
        color: 'text-red-700 bg-red-100 border-red-300',
        progressColor: 'bg-red-700',
        icon: XCircle,
        text: 'Breached',
      };
  }
}

export function SLAIndicator({
  dueAt,
  completedAt,
  createdAt,
  isBreached,
  label,
  showCountdown = true,
  compact = false,
  pausedAt = null,
  pauseDurationMinutes = 0,
  showProgress = false,
}: SLAIndicatorProps) {
  const settings = useSLASettings();

  const warningThreshold = settings?.warning_threshold_percent ?? DEFAULT_THRESHOLDS.warning;
  const criticalThreshold = settings?.critical_threshold_percent ?? DEFAULT_THRESHOLDS.critical;

  const slaState = useMemo(() => {
    if (!dueAt) return null;

    if (completedAt) {
      return {
        status: 'completed' as const,
        color: 'text-green-600 bg-green-50 border-green-200',
        progressColor: 'bg-green-500',
        icon: CheckCircle,
        text: 'Completed',
        consumption: 0,
      };
    }

    if (pausedAt) {
      return {
        status: 'paused' as const,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        progressColor: 'bg-blue-500',
        icon: Pause,
        text: 'Paused',
        consumption: 0,
      };
    }

    const due = new Date(dueAt);
    const isPastDue = isPast(due);

    let consumption = 0;
    if (createdAt) {
      consumption = calculateConsumption(dueAt, createdAt, pauseDurationMinutes);
    } else {
      const now = new Date();
      const totalMinutes = differenceInMinutes(due, now);
      const originalMinutes = 8 * 60;
      consumption = ((originalMinutes - totalMinutes) / originalMinutes) * 100;
    }

    const status = getSLAStatusFromConsumption(
      consumption,
      isBreached,
      isPastDue,
      warningThreshold,
      criticalThreshold
    );

    const timeText = isPastDue
      ? `${formatDistanceToNow(due)} overdue`
      : formatDistanceToNow(due, { addSuffix: true });

    const config = getStatusConfig(status, timeText);

    return {
      ...config,
      status,
      consumption: Math.min(100, consumption),
    };
  }, [dueAt, completedAt, createdAt, isBreached, pausedAt, pauseDurationMinutes, warningThreshold, criticalThreshold]);

  if (!slaState) return null;

  const Icon = slaState.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${slaState.color}`}
        title={`${slaState.text} (${Math.round(slaState.consumption)}% consumed)`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${slaState.color}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label && <span className="opacity-70">{label}:</span>}
        {showCountdown && <span>{slaState.text}</span>}
      </div>
      {showProgress && slaState.status !== 'completed' && slaState.status !== 'paused' && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${slaState.progressColor} transition-all duration-300`}
            style={{ width: `${slaState.consumption}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function SLAIndicatorForTicket({
  ticket,
  type = 'resolution',
  compact = false,
  showProgress = false,
}: SLAIndicatorForTicketProps) {
  const dueAt =
    type === 'acknowledgement' ? ticket.acknowledgement_due_at : ticket.resolution_due_at;
  const completedAt =
    type === 'acknowledgement' ? ticket.acknowledged_at : ticket.resolved_at;
  const isBreached =
    type === 'acknowledgement' ? ticket.is_acknowledgement_breached : ticket.is_resolution_breached;

  return (
    <SLAIndicator
      dueAt={dueAt}
      completedAt={completedAt}
      createdAt={ticket.created_at}
      isBreached={isBreached}
      pausedAt={ticket.sla_paused_at}
      pauseDurationMinutes={ticket.sla_pause_duration_minutes}
      compact={compact}
      showProgress={showProgress}
      label={type === 'acknowledgement' ? 'Ack' : undefined}
    />
  );
}

export function SLAProgressBar({ ticket }: { ticket: Ticket }) {
  const settings = useSLASettings();

  const warningThreshold = settings?.warning_threshold_percent ?? DEFAULT_THRESHOLDS.warning;
  const criticalThreshold = settings?.critical_threshold_percent ?? DEFAULT_THRESHOLDS.critical;

  const state = useMemo(() => {
    if (!ticket.resolution_due_at) return null;

    if (ticket.resolved_at || ticket.closed_at) {
      return {
        status: 'completed' as const,
        consumption: 0,
        colors: { bg: 'bg-green-100', bar: 'bg-green-500' },
      };
    }

    if (ticket.sla_paused_at) {
      const consumption = calculateConsumption(
        ticket.resolution_due_at,
        ticket.created_at,
        ticket.sla_pause_duration_minutes
      );
      return {
        status: 'paused' as const,
        consumption,
        colors: { bg: 'bg-blue-100', bar: 'bg-blue-500' },
      };
    }

    const due = new Date(ticket.resolution_due_at);
    const isPastDue = isPast(due);
    const consumption = calculateConsumption(
      ticket.resolution_due_at,
      ticket.created_at,
      ticket.sla_pause_duration_minutes
    );

    const status = getSLAStatusFromConsumption(
      consumption,
      ticket.is_resolution_breached,
      isPastDue,
      warningThreshold,
      criticalThreshold
    );

    let colors = { bg: 'bg-green-100', bar: 'bg-green-500' };
    if (status === 'warning') {
      colors = { bg: 'bg-amber-100', bar: 'bg-amber-500' };
    } else if (status === 'critical') {
      colors = { bg: 'bg-red-100', bar: 'bg-red-500' };
    } else if (status === 'breached') {
      colors = { bg: 'bg-red-200', bar: 'bg-red-700' };
    }

    return { status, consumption, colors };
  }, [ticket, warningThreshold, criticalThreshold]);

  if (!state) return null;

  return (
    <div className="space-y-1">
      <div className={`w-full h-2 ${state.colors.bg} rounded-full overflow-hidden relative`}>
        <div
          className="absolute h-full w-px bg-amber-600 opacity-50"
          style={{ left: `${warningThreshold}%` }}
        />
        <div
          className="absolute h-full w-px bg-red-600 opacity-50"
          style={{ left: `${criticalThreshold}%` }}
        />
        <div
          className={`h-full ${state.colors.bar} transition-all duration-300`}
          style={{ width: `${Math.min(100, state.consumption)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{Math.round(state.consumption)}% consumed</span>
        <span>
          {state.status === 'completed'
            ? 'Resolved'
            : state.status === 'paused'
              ? 'Paused'
              : state.status === 'breached'
                ? 'Breached'
                : `${100 - Math.round(state.consumption)}% remaining`}
        </span>
      </div>
    </div>
  );
}
