/**
 * Business Timezone & Date Range Calculation Utilities for OXID WA Ledger.
 * Step 4: Pure native platform implementation respecting configured business timezones.
 */

/**
 * Returns the business local date string formatted as "YYYY-MM-DD".
 */
export function getBusinessLocalDate(date: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    // Fallback to Asia/Jakarta if invalid timezone string provided
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  }
}

/**
 * Computes the timezone offset in minutes between UTC and the specified timezone for a given date.
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(date);

    const mapping: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        mapping[p.type] = parseInt(p.value, 10);
      }
    }

    const localTime = Date.UTC(
      mapping.year,
      mapping.month - 1,
      mapping.day,
      mapping.hour === 24 ? 0 : mapping.hour,
      mapping.minute,
      mapping.second
    );

    return (localTime - date.getTime()) / 60000;
  } catch {
    // Default to +07:00 (420 minutes) for Western/Central Indonesia
    return 420;
  }
}

/**
 * Converts a specific local date and time in a timezone into a UTC Date.
 */
export function localToUtc(
  year: number,
  month: number, // 1-indexed (1 = January)
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
): Date {
  const approximateUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offsetMinutes = getTimezoneOffsetMinutes(approximateUtc, timeZone);
  return new Date(approximateUtc.getTime() - offsetMinutes * 60000);
}

/**
 * Gets UTC timestamp boundaries for today in the business timezone.
 */
export function getTodayUtcRange(
  referenceDate: Date,
  timeZone: string
): { startAt: Date; endAt: Date; localDate: string } {
  const localDateStr = getBusinessLocalDate(referenceDate, timeZone);
  const [yearStr, monthStr, dayStr] = localDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const startAt = localToUtc(year, month, day, 0, 0, 0, 0, timeZone);
  const endAt = localToUtc(year, month, day, 23, 59, 59, 999, timeZone);

  return {
    startAt,
    endAt,
    localDate: localDateStr,
  };
}

/**
 * Gets UTC timestamp boundaries for the current week (Monday 00:00:00 to Sunday 23:59:59)
 * in the business timezone according to Indonesian SME standard.
 */
export function getWeekUtcRange(
  referenceDate: Date,
  timeZone: string
): { startAt: Date; endAt: Date; localStartDate: string; localEndDate: string } {
  const localDateStr = getBusinessLocalDate(referenceDate, timeZone);
  const [yearStr, monthStr, dayStr] = localDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Determine local day of week using local noon date
  const localDayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = localDayDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // In Indonesian SME, Monday is the start of the week:
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(Date.UTC(year, month - 1, day + diffToMonday, 12, 0, 0));
  const sundayDate = new Date(Date.UTC(year, month - 1, day + diffToMonday + 6, 12, 0, 0));

  const startYear = mondayDate.getUTCFullYear();
  const startMonth = mondayDate.getUTCMonth() + 1;
  const startDay = mondayDate.getUTCDate();

  const endYear = sundayDate.getUTCFullYear();
  const endMonth = sundayDate.getUTCMonth() + 1;
  const endDay = sundayDate.getUTCDate();

  const startAt = localToUtc(startYear, startMonth, startDay, 0, 0, 0, 0, timeZone);
  const endAt = localToUtc(endYear, endMonth, endDay, 23, 59, 59, 999, timeZone);

  const localStartDate = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const localEndDate = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  return {
    startAt,
    endAt,
    localStartDate,
    localEndDate,
  };
}

/**
 * Gets UTC timestamp boundaries for the current month (1st 00:00:00 to last day 23:59:59)
 * in the business timezone.
 */
export function getMonthUtcRange(
  referenceDate: Date,
  timeZone: string
): { startAt: Date; endAt: Date; localStartDate: string; localEndDate: string } {
  const localDateStr = getBusinessLocalDate(referenceDate, timeZone);
  const [yearStr, monthStr] = localDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Number of days in this month: day 0 of month + 1 gives the last day of month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const startAt = localToUtc(year, month, 1, 0, 0, 0, 0, timeZone);
  const endAt = localToUtc(year, month, lastDay, 23, 59, 59, 999, timeZone);

  const localStartDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const localEndDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return {
    startAt,
    endAt,
    localStartDate,
    localEndDate,
  };
}
