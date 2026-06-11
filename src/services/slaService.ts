import { supabase } from '../lib/supabase';
import { SLAPolicy, BusinessHours, Holiday, BusinessHoursConfig } from '../types';
import { addHours, addMinutes, format, isBefore, isAfter, setHours, setMinutes } from 'date-fns';

let cachedBusinessHours: BusinessHours[] | null = null;
let cachedHolidays: Holiday[] | null = null;
let cachedConfig: BusinessHoursConfig | null = null;

export async function getBusinessHours(): Promise<BusinessHours[]> {
  if (cachedBusinessHours) return cachedBusinessHours;

  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .order('day_of_week');

  if (error) throw error;
  cachedBusinessHours = data || [];
  return cachedBusinessHours;
}

export async function getHolidays(): Promise<Holiday[]> {
  if (cachedHolidays) return cachedHolidays;

  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('holiday_date');

  if (error) throw error;
  cachedHolidays = data || [];
  return cachedHolidays;
}

export async function getBusinessHoursConfig(): Promise<BusinessHoursConfig | null> {
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabase
    .from('business_hours_config')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching business hours config:', error);
    return null;
  }

  cachedConfig = data;
  return cachedConfig;
}

export function clearCache(): void {
  cachedBusinessHours = null;
  cachedHolidays = null;
  cachedConfig = null;
}

export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  const monthDay = dateStr.substring(5);

  return holidays.some(h => {
    if (h.holiday_date === dateStr) return true;
    if (h.is_recurring) {
      const holidayMonthDay = h.holiday_date.substring(5);
      return holidayMonthDay === monthDay;
    }
    return false;
  });
}

export function isWorkingDay(date: Date, businessHours: BusinessHours[], holidays: Holiday[]): boolean {
  if (isHoliday(date, holidays)) return false;

  const dayOfWeek = date.getDay();
  const dayConfig = businessHours.find(bh => bh.day_of_week === dayOfWeek);

  return dayConfig?.is_working_day ?? false;
}

export function getWorkingHoursForDay(date: Date, businessHours: BusinessHours[]): { start: Date; end: Date } | null {
  const dayOfWeek = date.getDay();
  const dayConfig = businessHours.find(bh => bh.day_of_week === dayOfWeek);

  if (!dayConfig?.is_working_day) return null;

  const [startH, startM] = dayConfig.start_time.split(':').map(Number);
  const [endH, endM] = dayConfig.end_time.split(':').map(Number);

  const start = setMinutes(setHours(new Date(date), startH), startM);
  start.setSeconds(0, 0);

  const end = setMinutes(setHours(new Date(date), endH), endM);
  end.setSeconds(0, 0);

  return { start, end };
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function isAfterCutoff(date: Date, cutoffTime: string): boolean {
  const cutoffMinutes = timeToMinutes(cutoffTime);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes >= cutoffMinutes;
}

function getBreakWindow(config: BusinessHoursConfig | null): { start: number; end: number; duration: number } | null {
  if (!config?.break_enabled) return null;

  const breakStart = timeToMinutes(config.break_start);
  const breakEnd = timeToMinutes(config.break_end);

  return {
    start: breakStart,
    end: breakEnd,
    duration: breakEnd - breakStart
  };
}

function calculateAvailableMinutesInDay(
  currentDate: Date,
  startMinuteOfDay: number,
  workingHours: { start: Date; end: Date },
  breakWindow: { start: number; end: number; duration: number } | null
): { availableMinutes: number; effectiveStart: number; effectiveEnd: number } {
  const dayStartMinutes = workingHours.start.getHours() * 60 + workingHours.start.getMinutes();
  const dayEndMinutes = workingHours.end.getHours() * 60 + workingHours.end.getMinutes();

  let effectiveStart = Math.max(startMinuteOfDay, dayStartMinutes);
  let effectiveEnd = dayEndMinutes;

  if (effectiveStart >= effectiveEnd) {
    return { availableMinutes: 0, effectiveStart, effectiveEnd };
  }

  if (breakWindow) {
    if (effectiveStart < breakWindow.start && effectiveEnd > breakWindow.end) {
      const beforeBreak = Math.max(0, breakWindow.start - effectiveStart);
      const afterBreak = Math.max(0, effectiveEnd - breakWindow.end);
      return {
        availableMinutes: beforeBreak + afterBreak,
        effectiveStart,
        effectiveEnd,
      };
    } else if (effectiveStart >= breakWindow.start && effectiveStart < breakWindow.end) {
      effectiveStart = breakWindow.end;
    } else if (effectiveEnd > breakWindow.start && effectiveEnd <= breakWindow.end) {
      effectiveEnd = breakWindow.start;
    }
  }

  const availableMinutes = Math.max(0, effectiveEnd - effectiveStart);
  return { availableMinutes, effectiveStart, effectiveEnd };
}

export async function calculateBusinessHoursDue(
  startDate: Date,
  businessHoursToAdd: number
): Promise<Date> {
  const businessHours = await getBusinessHours();
  const holidays = await getHolidays();
  const config = await getBusinessHoursConfig();

  let remainingMinutes = businessHoursToAdd * 60;
  let currentDate = new Date(startDate);

  const breakWindow = getBreakWindow(config);
  const cutoffTime = config?.cutoff_time || '17:00:00';
  const excludeNonWorking = config?.exclude_non_working_days ?? true;

  if (excludeNonWorking && isAfterCutoff(currentDate, cutoffTime)) {
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  const maxIterations = 365;
  let iterations = 0;
  let startMinuteOfDay = currentDate.getHours() * 60 + currentDate.getMinutes();

  while (remainingMinutes > 0 && iterations < maxIterations) {
    iterations++;

    if (excludeNonWorking && !isWorkingDay(currentDate, businessHours, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    const workingHours = getWorkingHoursForDay(currentDate, businessHours);
    if (!workingHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    const dayStartMinutes = workingHours.start.getHours() * 60 + workingHours.start.getMinutes();
    if (startMinuteOfDay < dayStartMinutes) {
      startMinuteOfDay = dayStartMinutes;
    }

    const { availableMinutes } = calculateAvailableMinutesInDay(
      currentDate,
      startMinuteOfDay,
      workingHours,
      breakWindow
    );

    if (availableMinutes <= 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    if (availableMinutes >= remainingMinutes) {
      let deadlineMinute = startMinuteOfDay + remainingMinutes;

      if (breakWindow && startMinuteOfDay < breakWindow.start && deadlineMinute >= breakWindow.start) {
        deadlineMinute += breakWindow.duration;
      }

      const deadlineHours = Math.floor(deadlineMinute / 60);
      const deadlineMins = deadlineMinute % 60;

      const deadline = new Date(currentDate);
      deadline.setHours(deadlineHours, deadlineMins, 0, 0);
      return deadline;
    }

    remainingMinutes -= availableMinutes;
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
    startMinuteOfDay = 0;
  }

  return currentDate;
}

export async function calculateSLADueDates(slaPolicy: SLAPolicy): Promise<{
  acknowledgementDue: string;
  resolutionDue: string;
}> {
  const now = new Date();

  const ackHours = slaPolicy.acknowledgement_hours;
  const resHours = slaPolicy.resolution_hours;

  const [acknowledgementDueDate, resolutionDueDate] = await Promise.all([
    calculateBusinessHoursDue(now, ackHours),
    calculateBusinessHoursDue(now, resHours)
  ]);

  return {
    acknowledgementDue: acknowledgementDueDate.toISOString(),
    resolutionDue: resolutionDueDate.toISOString()
  };
}

export function calculateSLADueDatesSync(slaPolicy: SLAPolicy): {
  acknowledgementDue: string;
  resolutionDue: string;
} {
  const now = new Date();

  const ackHours = slaPolicy.acknowledgement_hours;
  const resHours = slaPolicy.resolution_hours;

  const acknowledgementDue = addHours(now, ackHours).toISOString();
  const resolutionDue = addHours(now, resHours).toISOString();

  return { acknowledgementDue, resolutionDue };
}

export function getSLAStatus(
  dueAt: string | null,
  completedAt: string | null,
  isBreached: boolean,
  pausedAt: string | null = null
): 'completed' | 'breached' | 'critical' | 'warning' | 'healthy' | null {
  if (!dueAt) return null;

  if (completedAt) return 'completed';
  if (isBreached) return 'breached';
  if (pausedAt) return 'healthy';

  const now = new Date();
  const due = new Date(dueAt);

  if (now >= due) return 'breached';

  const totalMs = due.getTime() - now.getTime();
  const originalMs = 8 * 60 * 60 * 1000;
  const percentRemaining = (totalMs / originalMs) * 100;

  if (percentRemaining <= 10) return 'critical';
  if (percentRemaining <= 25) return 'warning';
  return 'healthy';
}

export function formatSLATime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }
  if (hours < 24) {
    return `${hours} business hour${hours !== 1 ? 's' : ''}`;
  }
  const days = hours / 8;
  return `${days} business day${days !== 1 ? 's' : ''}`;
}

export async function shouldPauseSLA(status: string): Promise<boolean> {
  const pauseStatuses = ['waiting_for_employee'];
  return pauseStatuses.includes(status);
}

export async function calculateRemainingBusinessMinutes(
  dueAt: Date,
  fromDate: Date = new Date()
): Promise<number> {
  const businessHours = await getBusinessHours();
  const holidays = await getHolidays();
  const config = await getBusinessHoursConfig();

  if (fromDate >= dueAt) return 0;

  let totalMinutes = 0;
  let currentDate = new Date(fromDate);
  const breakWindow = getBreakWindow(config);
  const excludeNonWorking = config?.exclude_non_working_days ?? true;

  const maxIterations = 365;
  let iterations = 0;

  while (currentDate < dueAt && iterations < maxIterations) {
    iterations++;

    if (excludeNonWorking && !isWorkingDay(currentDate, businessHours, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    const workingHours = getWorkingHoursForDay(currentDate, businessHours);
    if (!workingHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    let dayStart = workingHours.start;
    let dayEnd = workingHours.end;

    if (currentDate.toDateString() === fromDate.toDateString()) {
      if (isBefore(fromDate, workingHours.start)) {
        dayStart = workingHours.start;
      } else if (isAfter(fromDate, workingHours.end)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      } else {
        dayStart = fromDate;
      }
    }

    if (currentDate.toDateString() === dueAt.toDateString()) {
      if (isBefore(dueAt, workingHours.start)) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
        continue;
      } else if (isBefore(dueAt, workingHours.end)) {
        dayEnd = dueAt;
      }
    }

    let minutesInDay = Math.floor((dayEnd.getTime() - dayStart.getTime()) / 60000);

    if (breakWindow) {
      const dayStartMinutes = dayStart.getHours() * 60 + dayStart.getMinutes();
      const dayEndMinutes = dayEnd.getHours() * 60 + dayEnd.getMinutes();

      if (dayStartMinutes < breakWindow.end && dayEndMinutes > breakWindow.start) {
        const overlapStart = Math.max(dayStartMinutes, breakWindow.start);
        const overlapEnd = Math.min(dayEndMinutes, breakWindow.end);
        minutesInDay -= Math.max(0, overlapEnd - overlapStart);
      }
    }

    totalMinutes += Math.max(0, minutesInDay);

    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return totalMinutes;
}
