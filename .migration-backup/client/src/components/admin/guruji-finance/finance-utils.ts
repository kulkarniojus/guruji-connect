import type { FinanceCategory, FinanceDirection } from '@shared/gurujiFinance';

export const FINANCE_BASE = '/api/admin/guruji-finance';
export const FINANCE_KEY = [FINANCE_BASE];

export const money = (value: unknown) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const kolkataDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
};

export const dateLabel = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const gurujiName = (row: any) =>
  [row?.firstName, row?.lastName].filter(Boolean).join(' ') || row?.gurujiName || `Guruji #${row?.id ?? row?.gurujiId ?? '—'}`;

export const categoryLabel: Record<FinanceCategory, string> = {
  fine: 'Fine',
  expense: 'Expense',
  extra_charge: 'Extra charge',
  reimbursement: 'Reimbursement',
  adjustment: 'Adjustment',
  settlement: 'Settlement record',
};

export const directionLabel = (category: FinanceCategory, direction: FinanceDirection) => {
  if (category === 'settlement') {
    return direction === 'portal_owes_guruji'
      ? 'Guruji paid portal · reduces balance'
      : 'Portal paid Guruji · increases balance';
  }
  return direction === 'guruji_owes_portal' ? 'Guruji owes portal' : 'Portal owes Guruji';
};

export const csvUrl = (section: string, filters: Record<string, string>) => {
  const params = new URLSearchParams({ section });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return `${FINANCE_BASE}/export?${params.toString()}`;
};

export async function financeRequest<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${FINANCE_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  const type = response.headers.get('content-type') || '';
  return (type.includes('application/json') ? response.json() : undefined) as Promise<T>;
}

export const currentMonth = () => {
  const parts = kolkataDateParts();
  return `${parts.year}-${parts.month}`;
};
export const today = () => {
  const parts = kolkataDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
};
