import { pool } from './db';
import { commissionSplit, resolveCommissionPolicy, type CommissionSnapshot } from '@workspace/portal-shared/pujaCommission';

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
  await pool.query(`CREATE TABLE IF NOT EXISTS other_category_commission_overrides (
    category_id INTEGER PRIMARY KEY REFERENCES other_registration_categories(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK(percentage BETWEEN 0 AND 100),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  // Preserve any existing commission configured through the category's linked puja.
  await pool.query(`INSERT INTO other_category_commission_overrides(category_id,percentage,updated_by,updated_at)
    SELECT c.id,o.percentage,o.updated_by,o.updated_at
    FROM other_registration_categories c
    JOIN puja_commission_overrides o ON o.puja_id=c.puja_id
    ON CONFLICT(category_id) DO NOTHING`);
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_snapshot JSONB');
  await pool.query(`ALTER TABLE booking_requests
    ADD COLUMN IF NOT EXISTS commission_acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS commission_acknowledgement JSONB`);
}

export async function getBookingCommission(pujaId: number|null, finalBookingAmount: number): Promise<CommissionSnapshot> {
  // Read all policy scopes together so each booking gets one consistent snapshot.
  const row=(await pool.query(`SELECT s.percentage AS default_percentage,s.configured,
    s.updated_at AS default_updated_at,o.percentage AS override_percentage,o.updated_at AS override_updated_at,
    c.id AS category_id,c.name AS category_name,co.percentage AS category_override,co.updated_at AS category_updated_at
    FROM puja_commission_settings s
    LEFT JOIN puja_commission_overrides o ON o.puja_id=$1
    LEFT JOIN other_registration_categories c ON c.puja_id=$1
    LEFT JOIN other_category_commission_overrides co ON co.category_id=c.id
    WHERE s.id=1`,[pujaId])).rows[0];
  if(!row) throw new Error('Commission configuration is not initialized');
  const policy=resolveCommissionPolicy({
    defaultPercentage:Number(row.default_percentage),
    defaultConfigured:row.configured,
    pujaOverride:row.override_percentage===null?null:Number(row.override_percentage),
    otherCategoryOverride:row.category_override===null?null:Number(row.category_override),
  });
  const categoryOverride=policy.source==='other_category';
  const pujaOverride=policy.source==='puja';
  const updatedAt=categoryOverride?row.category_updated_at:pujaOverride?row.override_updated_at:row.default_updated_at;
  return {...commissionSplit(Number(finalBookingAmount),policy.percentage),pujaId,
    categoryId:row.category_id==null?null:Number(row.category_id),
    categoryName:row.category_name??null,
    currency:'INR',configured:policy.configured,source:policy.source,
    policyUpdatedAt:updatedAt?new Date(updatedAt).toISOString():null,recordedAt:new Date().toISOString()};
}
