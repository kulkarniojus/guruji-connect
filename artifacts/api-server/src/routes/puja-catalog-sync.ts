import { Router, type Request, type Response } from 'express';
import { pool } from '../db';
import { logger } from '../lib/logger';
import { popularPujaCatalogSnapshot } from '../data/popular-puja-catalog-snapshot';

const router = Router();
const auditAction = 'popular_puja_catalog_sync_v1';

type StoredPuja = {
  id: number;
  name: string;
  basePrice: number;
  price: number | null;
  imageUrl: string | null;
  isPopular: boolean;
  isActive: boolean;
};

type PlanAction = 'update' | 'insert' | 'unmark_popular' | 'skip_inactive';
type PlanItem = {
  id: number | null;
  name: string;
  action: PlanAction;
  currentImageUrl: string | null;
  targetImageUrl: string | null;
  currentIsPopular: boolean | null;
  targetIsPopular: boolean;
  currentBasePrice: number | null;
  currentPrice: number | null;
  targetBasePrice: number | null;
  targetPrice: number | null;
  sourceIndex?: number;
};

type TransactionClient = {
  query: (text: string, values?: any[]) => Promise<any>;
  release: () => void;
};

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('en');

async function readPujas(client: any, lockRows = false): Promise<StoredPuja[]> {
  const result = await client.query(
    `SELECT id,name,"basePrice",price,"imageUrl","isPopular","isActive"
     FROM pujas ORDER BY id${lockRows ? ' FOR UPDATE' : ''}`,
  );
  return result.rows.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    basePrice: Number(row.basePrice),
    price: row.price == null ? null : Number(row.price),
    imageUrl: row.imageUrl == null ? null : String(row.imageUrl),
    isPopular: row.isPopular === true,
    isActive: row.isActive === true,
  }));
}

function buildPlan(rows: StoredPuja[]): PlanItem[] {
  const snapshotNames = new Set(popularPujaCatalogSnapshot.map(item => normalizeName(item.name)));
  const plan: PlanItem[] = [];

  popularPujaCatalogSnapshot.forEach((target, sourceIndex) => {
    const matches = rows.filter(row => normalizeName(row.name) === normalizeName(target.name));
    const activeMatches = matches.filter(row => row.isActive);

    if (activeMatches.length > 0) {
      for (const row of activeMatches) {
        if (!row.isPopular || row.imageUrl !== target.imageUrl) {
          plan.push({
            id: row.id,
            name: row.name,
            action: 'update',
            currentImageUrl: row.imageUrl,
            targetImageUrl: target.imageUrl,
            currentIsPopular: row.isPopular,
            targetIsPopular: true,
            currentBasePrice: row.basePrice,
            currentPrice: row.price,
            targetBasePrice: row.basePrice,
            targetPrice: row.price,
            sourceIndex,
          });
        }
      }
      return;
    }

    if (matches.length > 0) {
      const inactive = matches[0];
      plan.push({
        id: inactive.id,
        name: inactive.name,
        action: 'skip_inactive',
        currentImageUrl: inactive.imageUrl,
        targetImageUrl: target.imageUrl,
        currentIsPopular: inactive.isPopular,
        targetIsPopular: true,
        currentBasePrice: inactive.basePrice,
        currentPrice: inactive.price,
        targetBasePrice: inactive.basePrice,
        targetPrice: inactive.price,
      });
      return;
    }

    plan.push({
      id: null,
      name: target.name,
      action: 'insert',
      currentImageUrl: null,
      targetImageUrl: target.imageUrl,
      currentIsPopular: null,
      targetIsPopular: true,
      currentBasePrice: null,
      currentPrice: null,
      targetBasePrice: target.basePrice,
      targetPrice: target.price,
      sourceIndex,
    });
  });

  for (const row of rows) {
    if (row.isActive && row.isPopular && !snapshotNames.has(normalizeName(row.name))) {
      plan.push({
        id: row.id,
        name: row.name,
        action: 'unmark_popular',
        currentImageUrl: row.imageUrl,
        targetImageUrl: row.imageUrl,
        currentIsPopular: true,
        targetIsPopular: false,
        currentBasePrice: row.basePrice,
        currentPrice: row.price,
        targetBasePrice: row.basePrice,
        targetPrice: row.price,
      });
    }
  }

  return plan;
}

function summarize(plan: PlanItem[]) {
  return {
    updateCount: plan.filter(item => item.action === 'update').length,
    insertCount: plan.filter(item => item.action === 'insert').length,
    unmarkPopularCount: plan.filter(item => item.action === 'unmark_popular').length,
    skippedInactiveCount: plan.filter(item => item.action === 'skip_inactive').length,
  };
}

async function hasAlreadyApplied(client: any): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS(SELECT 1 FROM super_admin_audit_log WHERE action=$1) AS applied`,
    [auditAction],
  );
  return result.rows[0]?.applied === true;
}

router.get('/preview', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows, alreadyApplied] = await Promise.all([
      readPujas(pool),
      hasAlreadyApplied(pool),
    ]);
    const plan = buildPlan(rows);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ alreadyApplied, ...summarize(plan), items: plan.map(({ sourceIndex: _sourceIndex, ...item }) => item) });
  } catch (error) {
    logger.error({ err: error }, 'Could not preview the popular puja catalog sync');
    res.status(503).json({ message: 'Catalog sync preview is unavailable.' });
  }
});

router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  const actorId = Number(req.session?.userId);
  if (!Number.isSafeInteger(actorId) || actorId <= 0) {
    res.status(401).json({ message: 'Please sign in again.' });
    return;
  }

  let client: TransactionClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('vaidik-dhara-popular-puja-catalog-sync-v1'))`);

    if (await hasAlreadyApplied(client)) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'This one-time catalog sync has already been applied.' });
      return;
    }

    const rows = await readPujas(client, true);
    const plan = buildPlan(rows);
    let updated = 0;
    let inserted = 0;
    let unmarkedPopular = 0;
    const skippedInactive = plan.filter(item => item.action === 'skip_inactive').length;

    for (const item of plan) {
      if (item.action === 'update' && item.id != null) {
        await client.query(
          `UPDATE pujas SET "imageUrl"=$1,"isPopular"=TRUE,"updatedAt"=NOW()
           WHERE id=$2 AND "isActive"=TRUE`,
          [item.targetImageUrl, item.id],
        );
        updated += 1;
      } else if (item.action === 'unmark_popular' && item.id != null) {
        await client.query(
          `UPDATE pujas SET "isPopular"=FALSE,"updatedAt"=NOW()
           WHERE id=$1 AND "isActive"=TRUE`,
          [item.id],
        );
        unmarkedPopular += 1;
      } else if (item.action === 'insert' && item.sourceIndex != null) {
        const source = popularPujaCatalogSnapshot[item.sourceIndex];
        await client.query(
          `INSERT INTO pujas
            (name,description,"basePrice",price,type,duration,items,"imageUrl","isPopular","isActive",samagri,"createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE,$9::jsonb,NOW(),NOW())`,
          [
            source.name,
            source.description,
            source.basePrice,
            source.price,
            source.type,
            source.duration,
            source.items,
            source.imageUrl,
            JSON.stringify(source.samagri),
          ],
        );
        inserted += 1;
      }
    }

    await client.query(
      `INSERT INTO super_admin_audit_log(actor_id,target_id,action) VALUES($1,$1,$2)`,
      [actorId, auditAction],
    );
    await client.query('COMMIT');
    res.json({ applied: true, updated, inserted, unmarkedPopular, skippedInactive });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    logger.error({ err: error, actorId }, 'Could not apply the popular puja catalog sync');
    res.status(503).json({ message: 'Catalog sync could not be completed. No partial changes were kept.' });
  } finally {
    client?.release();
  }
});

export default router;
