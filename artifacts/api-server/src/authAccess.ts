import type { Request } from 'express';
import { pool } from './db';

const sampleEmails = new Set([
  'ramesh.sharma@gurujiconnect.com', 'priya.devi@gurujiconnect.com',
  'suresh.kumar@gurujiconnect.com', 'vijay.mishra@gurujiconnect.com',
  'anita.joshi@gurujiconnect.com', 'krishna.sharma@gurujiconnect.com',
  'dev-admin@local.dev',
]);

export function isSampleAccount(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return sampleEmails.has(normalized) || /^demo\.(customer|guruji\d+)@example\.com$/.test(normalized);
}

export async function disableSampleAccounts() {
  await pool.query(
    `UPDATE users SET "isBlocked"=true,"updatedAt"=NOW()
     WHERE email=ANY($1::text[]) OR email ~ '^demo\\.(customer|guruji[0-9]+)@example\\.com$'`,
    [Array.from(sampleEmails)],
  );
}

export async function startUserSession(req: Request, user: {id: number; role: string; isSuperAdmin?: boolean}) {
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.isSuperAdmin = user.isSuperAdmin === true;
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}
