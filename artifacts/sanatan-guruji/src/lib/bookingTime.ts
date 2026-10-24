export function hasBookingStarted(dateValue: unknown, timeValue: unknown, now = Date.now()): boolean {
  if (!dateValue || typeof timeValue !== 'string') return false;

  const date = dateValue instanceof Date
    ? dateValue.toISOString().slice(0, 10)
    : String(dateValue).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i.exec(timeValue.trim());
  if (!match) return false;
  const hour = Number(match[1]);
  if (hour < 1 || hour > 12) return false;
  const minutes = (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
  const start = Date.parse(`${date}T00:00:00+05:30`) + minutes * 60_000;
  return Number.isFinite(start) && start <= now;
}
