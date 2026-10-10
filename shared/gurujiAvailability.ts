export interface AvailabilityRule {
  id?: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
}

export function clockMinutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

/** Calendar arithmetic only: these numbers represent local Indian wall-clock time. */
export function rulesBlockBooking(
  rules: AvailabilityRule[], date: string, startMinute: number, duration: number,
): boolean {
  const start = Date.parse(`${date}T00:00:00Z`) / 60_000 + startMinute;
  const end = start + Math.max(duration, 1);
  const firstDay = Math.floor(start / 1440);
  const lastDay = Math.floor((end - 0.001) / 1440);
  for (let day = firstDay; day <= lastDay; day++) {
    const dayDate = new Date(day * 86_400_000).toISOString().slice(0, 10);
    const dayRules = rules.filter(r => r.date === dayDate);
    const wholeDay = dayRules.find(r => r.startTime === null);
    const from = Math.max(0, start - day * 1440);
    const to = Math.min(1440, end - day * 1440);
    const windows = dayRules.filter(r => r.startTime !== null).map(r => ({
      start: clockMinutes(r.startTime!)!, end: clockMinutes(r.endTime!)!, available: r.isAvailable,
    }));
    const boundaries = [...new Set([from, to, ...windows.flatMap(w => [w.start, w.end])
      .filter(t => t > from && t < to)])].sort((a, b) => a - b);
    for (let i = 0; i < boundaries.length - 1; i++) {
      const minute = (boundaries[i] + boundaries[i + 1]) / 2;
      const matching = windows.filter(w => minute >= w.start && minute < w.end);
      const available = matching.length
        ? matching.every(w => w.available)
        : wholeDay?.isAvailable !== false;
      if (!available) return true;
    }
  }
  return false;
}
