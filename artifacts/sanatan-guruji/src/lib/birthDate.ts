export function parseBirthDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const written = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
  if (!iso && !written) return null;
  const year = Number(iso ? iso[1] : written![3]);
  const month = Number(iso ? iso[2] : written![2]);
  const day = Number(iso ? iso[3] : written![1]);
  if (year < 1900 || year > 9999) return null;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

export function birthDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function birthDateDisplay(value: string): string {
  const date = parseBirthDate(value);
  return date
    ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    : value;
}

export function ageFromBirthDate(value: string, asOf = new Date()): number | null {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return null;

  let age = asOf.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = asOf.getMonth() < birthDate.getMonth() ||
    (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export function isPastBirthDate(value: string): boolean {
  const date = parseBirthDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}