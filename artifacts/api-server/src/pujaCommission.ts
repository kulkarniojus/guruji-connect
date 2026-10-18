import { pool } from './db';
import { commissionSplit, type CommissionSnapshot } from '@workspace/portal-shared/pujaCommission';

export async function initializePujaCommissions() {
  await pool.query(`CREATE TABLE IF NOT EXISTS puja_commission_settings (
    id SMALLINT PRIMARY KEY CHECK(id=1),
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(percentage BETWEEN 0 AND 100),
    configured BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ
  )`);
  await pool.query(`INSERT INTO puja_commission_settings(id) VALUES (1) ON CONFLICT DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS puja_commission_overrides (
    puja_id INTEGER PRIMARY KEY REFERENCES pujas(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK(percentage BETWEEN 0 AND 100),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_snapshot JSONB');
  await pool.query(`ALTER TABLE booking_requests
    ADD COLUMN IF NOT EXISTS commission_acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS commission_acknowledgement JSONB`);
}

export async function getBookingCommission(pujaId: number|null, finalBookingAmount: number): Promise<CommissionSnapshot> {
  // Read both scopes in one statement: a bulk policy change cannot give a
  // booking a partially changed default/override combination.
  const row=(await pool.query(`SELECT s.percentage AS default_percentage,s.configured,
    s.updated_at AS default_updated_at,o.percentage AS override_percentage,o.updated_at AS override_updated_at
    FROM puja_commission_settings s LEFT JOIN puja_commission_overrides o ON o.puja_id=$1 WHERE s.id=1`,[pujaId])).rows[0];
  if(!row) throw new Error('Commission configuration is not initialized');
  const individual=row.override_percentage!==null;
  const configured=individual||row.configured;
  const percentage=Number(individual?row.override_percentage:row.default_percentage);
  const updatedAt=individual?row.override_updated_at:row.default_updated_at;
  return {...commissionSplit(Number(finalBookingAmount),percentage),pujaId,currency:'INR',configured,
    source:individual?'puja':configured?'default':'unconfigured',
    policyUpdatedAt:updatedAt?new Date(updatedAt).toISOString():null,recordedAt:new Date().toISOString()};
}
