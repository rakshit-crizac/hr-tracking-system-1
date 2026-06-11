import { supabase } from '../lib/supabase';
import { BusinessHours, BusinessHoursConfig, Holiday, SLAPreviewResult, SLABreakdownStep } from '../types';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'IST (India Standard Time)', offset: '+05:30' },
  { value: 'America/New_York', label: 'EST (Eastern Standard Time)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'CST (Central Standard Time)', offset: '-06:00' },
  { value: 'America/Los_Angeles', label: 'PST (Pacific Standard Time)', offset: '-08:00' },
  { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'CET (Central European Time)', offset: '+01:00' },
  { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore Time)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'AEST (Australian Eastern Time)', offset: '+10:00' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export { TIMEZONE_OPTIONS, DAY_NAMES };

export async function fetchBusinessHoursConfig(): Promise<BusinessHoursConfig | null> {
  const { data, error } = await supabase
    .from('business_hours_config')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching business hours config:', error);
    return null;
  }

  return data;
}

export async function updateBusinessHoursConfig(
  config: Partial<BusinessHoursConfig>
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('business_hours_config')
    .select('id')
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('business_hours_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('business_hours_config')
      .insert([config]);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

export async function fetchBusinessHours(): Promise<BusinessHours[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .order('day_of_week');

  if (error) {
    console.error('Error fetching business hours:', error);
    return [];
  }

  return data || [];
}

export async function updateBusinessHour(
  id: string,
  updates: Partial<BusinessHours>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('business_hours')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('holiday_date');

  if (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }

  return data || [];
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isHoliday(date: Date, holidays: Holiday[]): Holiday | null {
  const dateStr = date.toISOString().split('T')[0];
  const monthDay = dateStr.substring(5);

  for (const holiday of holidays) {
    const holidayDateStr = holiday.holiday_date;
    if (holidayDateStr === dateStr) {
      return holiday;
    }
    if (holiday.is_recurring) {
      const holidayMonthDay = holidayDateStr.substring(5);
      if (holidayMonthDay === monthDay) {
        return holiday;
      }
    }
  }
  return null;
}

function getWorkingMinutesForDay(
  date: Date,
  startMinuteOfDay: number,
  businessHour: BusinessHours,
  config: BusinessHoursConfig
): { availableMinutes: number; effectiveStart: number; effectiveEnd: number } {
  const dayStart = timeToMinutes(businessHour.start_time);
  const dayEnd = timeToMinutes(businessHour.end_time);

  let effectiveStart = Math.max(startMinuteOfDay, dayStart);
  let effectiveEnd = dayEnd;

  if (config.break_enabled) {
    const breakStart = timeToMinutes(config.break_start);
    const breakEnd = timeToMinutes(config.break_end);

    if (effectiveStart < breakStart && effectiveEnd > breakEnd) {
      const beforeBreak = Math.max(0, breakStart - effectiveStart);
      const afterBreak = Math.max(0, effectiveEnd - breakEnd);
      return {
        availableMinutes: beforeBreak + afterBreak,
        effectiveStart,
        effectiveEnd,
      };
    } else if (effectiveStart >= breakStart && effectiveStart < breakEnd) {
      effectiveStart = breakEnd;
    } else if (effectiveEnd > breakStart && effectiveEnd <= breakEnd) {
      effectiveEnd = breakStart;
    }
  }

  const availableMinutes = Math.max(0, effectiveEnd - effectiveStart);
  return { availableMinutes, effectiveStart, effectiveEnd };
}

export function calculateSLADeadline(
  ticketCreatedAt: Date,
  slaHours: number,
  businessHours: BusinessHours[],
  config: BusinessHoursConfig,
  holidays: Holiday[]
): SLAPreviewResult {
  const slaTotalMinutes = slaHours * 60;
  let remainingMinutes = slaTotalMinutes;
  const breakdown: SLABreakdownStep[] = [];
  const holidaysSkipped: string[] = [];

  let currentDate = new Date(ticketCreatedAt);
  let workingDaysUsed = 0;

  const cutoffMinutes = timeToMinutes(config.cutoff_time);
  const ticketMinuteOfDay = currentDate.getHours() * 60 + currentDate.getMinutes();

  const ticketDayOfWeek = currentDate.getDay();
  const ticketDayConfig = businessHours.find(bh => bh.day_of_week === ticketDayOfWeek);

  let isAfterCutoff = ticketMinuteOfDay >= cutoffMinutes;
  let startMinuteOfDay = ticketMinuteOfDay;

  if (ticketDayConfig && ticketDayConfig.is_working_day) {
    const dayStart = timeToMinutes(ticketDayConfig.start_time);
    const dayEnd = timeToMinutes(ticketDayConfig.end_time);

    if (ticketMinuteOfDay < dayStart) {
      startMinuteOfDay = dayStart;
      isAfterCutoff = false;
    } else if (ticketMinuteOfDay >= dayEnd) {
      isAfterCutoff = true;
    }
  }

  if (isAfterCutoff || !ticketDayConfig?.is_working_day) {
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
    startMinuteOfDay = 0;

    breakdown.push({
      date: formatDateForDisplay(ticketCreatedAt),
      dayName: DAY_NAMES[ticketCreatedAt.getDay()],
      minutesUsed: 0,
      hoursUsed: '0h',
      isHoliday: false,
      note: isAfterCutoff
        ? `Created after cutoff (${formatTimeFromMinutes(cutoffMinutes)}), SLA starts next working day`
        : 'Non-working day, SLA starts next working day',
    });
  }

  const maxIterations = 365;
  let iterations = 0;

  while (remainingMinutes > 0 && iterations < maxIterations) {
    iterations++;
    const dayOfWeek = currentDate.getDay();
    const businessHour = businessHours.find(bh => bh.day_of_week === dayOfWeek);

    const holiday = config.exclude_non_working_days ? isHoliday(currentDate, holidays) : null;

    if (holiday) {
      holidaysSkipped.push(holiday.name);
      breakdown.push({
        date: formatDateForDisplay(currentDate),
        dayName: DAY_NAMES[dayOfWeek],
        minutesUsed: 0,
        hoursUsed: '0h',
        isHoliday: true,
        note: `Holiday: ${holiday.name}`,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    if (!businessHour || !businessHour.is_working_day) {
      if (config.exclude_non_working_days) {
        breakdown.push({
          date: formatDateForDisplay(currentDate),
          dayName: DAY_NAMES[dayOfWeek],
          minutesUsed: 0,
          hoursUsed: '0h',
          isHoliday: false,
          note: 'Non-working day (skipped)',
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    const dayStart = timeToMinutes(businessHour.start_time);
    if (startMinuteOfDay < dayStart) {
      startMinuteOfDay = dayStart;
    }

    const { availableMinutes, effectiveEnd } = getWorkingMinutesForDay(
      currentDate,
      startMinuteOfDay,
      businessHour,
      config
    );

    if (availableMinutes <= 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      startMinuteOfDay = 0;
      continue;
    }

    workingDaysUsed++;
    const minutesUsedToday = Math.min(remainingMinutes, availableMinutes);
    remainingMinutes -= minutesUsedToday;

    breakdown.push({
      date: formatDateForDisplay(currentDate),
      dayName: DAY_NAMES[dayOfWeek],
      minutesUsed: minutesUsedToday,
      hoursUsed: minutesToTimeString(minutesUsedToday),
      isHoliday: false,
      note: remainingMinutes > 0
        ? `${minutesToTimeString(minutesUsedToday)} used, ${minutesToTimeString(remainingMinutes)} remaining`
        : `${minutesToTimeString(minutesUsedToday)} used, SLA deadline reached`,
    });

    if (remainingMinutes <= 0) {
      const deadlineMinuteOfDay = startMinuteOfDay + minutesUsedToday;

      let adjustedDeadlineMinute = deadlineMinuteOfDay;
      if (config.break_enabled) {
        const breakStart = timeToMinutes(config.break_start);
        const breakEnd = timeToMinutes(config.break_end);
        const breakDuration = breakEnd - breakStart;

        if (startMinuteOfDay < breakStart && deadlineMinuteOfDay > breakStart) {
          adjustedDeadlineMinute = deadlineMinuteOfDay + breakDuration;
        }
      }

      const deadlineHours = Math.floor(adjustedDeadlineMinute / 60);
      const deadlineMinutes = adjustedDeadlineMinute % 60;

      const deadline = new Date(currentDate);
      deadline.setHours(deadlineHours, deadlineMinutes, 0, 0);

      return {
        deadline,
        breakdown,
        totalBusinessMinutes: slaTotalMinutes,
        workingDaysUsed,
        holidaysSkipped,
      };
    }

    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
    startMinuteOfDay = 0;
  }

  return {
    deadline: currentDate,
    breakdown,
    totalBusinessMinutes: slaTotalMinutes,
    workingDaysUsed,
    holidaysSkipped,
  };
}

function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function calculateTotalWeeklyHours(businessHours: BusinessHours[]): number {
  return businessHours
    .filter(bh => bh.is_working_day)
    .reduce((total, bh) => {
      const start = timeToMinutes(bh.start_time);
      const end = timeToMinutes(bh.end_time);
      return total + (end - start);
    }, 0);
}

export function getWorkingDaysCount(businessHours: BusinessHours[]): number {
  return businessHours.filter(bh => bh.is_working_day).length;
}

export function validateBusinessHoursConfig(
  businessHours: BusinessHours[],
  config: BusinessHoursConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const workingDays = businessHours.filter(bh => bh.is_working_day);
  if (workingDays.length === 0) {
    errors.push('At least one working day must be configured');
  }

  for (const bh of workingDays) {
    const start = timeToMinutes(bh.start_time);
    const end = timeToMinutes(bh.end_time);

    if (end <= start) {
      errors.push(`${DAY_NAMES[bh.day_of_week]}: End time must be after start time`);
    }

    if (end - start < 60) {
      errors.push(`${DAY_NAMES[bh.day_of_week]}: Minimum working duration is 1 hour`);
    }
  }

  if (config.break_enabled) {
    const breakStart = timeToMinutes(config.break_start);
    const breakEnd = timeToMinutes(config.break_end);

    if (breakEnd <= breakStart) {
      errors.push('Break end time must be after break start time');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getDefaultConfig(): Partial<BusinessHoursConfig> {
  return {
    timezone: 'Asia/Kolkata',
    cutoff_time: '17:00:00',
    exclude_non_working_days: true,
    break_enabled: false,
    break_start: '13:00:00',
    break_end: '14:00:00',
  };
}
