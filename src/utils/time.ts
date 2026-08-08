/**
 * Yellowstone National Park operates on Mountain Time (America/Denver)
 */

export function formatTimeInTimezone(
  isoString: string,
  use24Hour = true,
  timezone = 'America/Denver'
): string {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: use24Hour ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !use24Hour,
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (e) {
    return isoString;
  }
}

export function getDayLabelInTimezone(
  isoString: string,
  timezone = 'America/Denver'
): { dayLabel: string; dateFormatted: string; isTomorrow: boolean; isToday: boolean; isYesterday: boolean } {
  if (!isoString) {
    return { dayLabel: '', dateFormatted: '', isTomorrow: false, isToday: true, isYesterday: false };
  }
  try {
    const targetDate = new Date(isoString);
    const now = new Date();

    const dFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    const targetParts = dFmt.formatToParts(targetDate);
    const nowParts = dFmt.formatToParts(now);

    const targetYear = parseInt(targetParts.find((p) => p.type === 'year')?.value || '0', 10);
    const targetMonth = parseInt(targetParts.find((p) => p.type === 'month')?.value || '0', 10);
    const targetDay = parseInt(targetParts.find((p) => p.type === 'day')?.value || '0', 10);

    const nowYear = parseInt(nowParts.find((p) => p.type === 'year')?.value || '0', 10);
    const nowMonth = parseInt(nowParts.find((p) => p.type === 'month')?.value || '0', 10);
    const nowDay = parseInt(nowParts.find((p) => p.type === 'day')?.value || '0', 10);

    const targetMidnight = Date.UTC(targetYear, targetMonth - 1, targetDay);
    const nowMidnight = Date.UTC(nowYear, nowMonth - 1, nowDay);

    const diffDays = Math.round((targetMidnight - nowMidnight) / (24 * 3600 * 1000));

    const dateFormatted = `${targetMonth}/${targetDay}/${targetYear.toString().slice(-2)}`;

    if (diffDays === 0) {
      return { dayLabel: 'Today', dateFormatted, isTomorrow: false, isToday: true, isYesterday: false };
    } else if (diffDays === 1) {
      return { dayLabel: `Tomorrow (${dateFormatted})`, dateFormatted, isTomorrow: true, isToday: false, isYesterday: false };
    } else if (diffDays === -1) {
      return { dayLabel: `Yesterday (${dateFormatted})`, dateFormatted, isTomorrow: false, isToday: false, isYesterday: true };
    } else if (diffDays > 1) {
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(targetDate);
      return { dayLabel: `${weekday}, ${dateFormatted}`, dateFormatted, isTomorrow: false, isToday: false, isYesterday: false };
    } else {
      return { dayLabel: dateFormatted, dateFormatted, isTomorrow: false, isToday: false, isYesterday: false };
    }
  } catch (e) {
    return { dayLabel: '', dateFormatted: '', isTomorrow: false, isToday: true, isYesterday: false };
  }
}

export function formatTimeWithDayLabel(
  isoString: string,
  use24Hour = true,
  timezone = 'America/Denver'
): string {
  const timeStr = formatTimeInTimezone(isoString, use24Hour, timezone);
  const { dayLabel, isToday } = getDayLabelInTimezone(isoString, timezone);
  if (isToday || !dayLabel) {
    return timeStr;
  }
  return `${timeStr} (${dayLabel})`;
}

export function formatWindowRange(
  startIso: string,
  endIso: string,
  use24Hour = true,
  timezone = 'America/Denver'
): string {
  const startStr = formatTimeInTimezone(startIso, use24Hour, timezone);
  const endStr = formatTimeInTimezone(endIso, use24Hour, timezone);
  return `${startStr} – ${endStr}`;
}

export function getMinutesUntil(targetIso: string): number {
  if (!targetIso) return 0;
  const now = Date.now();
  const target = new Date(targetIso).getTime();
  return Math.round((target - now) / (60 * 1000));
}

export function formatMinutesToHoursAndMinutes(minutes: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return '0m';
  const isNegative = minutes < 0;
  const absMin = Math.round(Math.abs(minutes));
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;

  let formatted = '';
  if (hrs === 0) {
    formatted = `${mins}m`;
  } else if (mins === 0) {
    formatted = `${hrs}h`;
  } else {
    formatted = `${hrs}h${mins}m`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function formatRelativeMinutes(minutes: number): string {
  if (minutes === 0) return 'Erupting now';
  if (minutes < 0) {
    const abs = Math.abs(minutes);
    return `${formatMinutesToHoursAndMinutes(abs)} ago`;
  }
  return `In ${formatMinutesToHoursAndMinutes(minutes)}`;
}

export function getMountainTimeNow(use24Hour = true): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Denver',
    hour: use24Hour ? '2-digit' : 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: !use24Hour,
  };
  return new Intl.DateTimeFormat('en-US', options).format(new Date());
}
