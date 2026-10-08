import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { pricingQuotePayload, pricingRulePayload, getPricingQuote, getPricingRules, mapPricingRule, validateRulePrices } from '../pujaPricing';
import { adjustedPrice } from '../../shared/pujaPricing';

const errorResponse = (res: Response, error: any) => {
  if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors.map(e => e.message).join('; ') });
  if (error.code === '23505') return res.status(409).json({ message: 'A rule already exists for this puja scope and time window. Edit that rule instead.' });
  if (error instanceof RangeError) return res.status(400).json({ message: error.message });
  console.error('Puja pricing request failed:', error.message);
  return res.status(error.status ?? 500).json({ message: error.status ? error.message : 'Could not complete this pricing request. Please try again.' });
};
const idOf = (params: unknown) => z.object({ id: z.coerce.number().int().positive() }).parse(params).id;

export const publicPricingRouter = Router();
publicPricingRouter.post('/quote', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json(await getPricingQuote(pricingQuotePayload.parse(req.body))); }
  catch (error) { errorResponse(res, error); }
});

const requirePricingAdmin = async (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, private');
  try {
    const user = req.session.userId ? (await pool.query('SELECT role,"isBlocked" FROM users WHERE id=$1', [req.session.userId])).rows[0] : null;
    if (!user || user.role !== 'admin' || user.isBlocked) {
      return res.status(req.session.userId ? 403 : 401).json({ message: 'Admin access required.' });
    }
    next();
  } catch (error) { res.status(500).json({ message: 'Could not verify admin access.' }); }
};
export const adminPricingRouter = Router();
adminPricingRouter.use(requirePricingAdmin);
adminPricingRouter.get('/rules', async (_req, res) => {
  try { res.json(await getPricingRules()); } catch (error) { errorResponse(res, error); }
});
adminPricingRouter.post('/rules', async (req, res) => {
  try {
    const rule = pricingRulePayload.parse(req.body);
    await validateRulePrices(rule);
    const row = (await pool.query(`INSERT INTO puja_pricing_rules
      (puja_id,name,within_hours,mode,value,customer_message,enabled) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [rule.pujaId,rule.name,rule.withinHours,rule.mode,rule.value,rule.customerMessage,rule.enabled])).rows[0];
    res.status(201).json(mapPricingRule(row));
  } catch (error) { errorResponse(res, error); }
});
adminPricingRouter.put('/rules/:id', async (req, res) => {
  try {
    const id = idOf(req.params), rule = pricingRulePayload.parse(req.body);
    await validateRulePrices(rule);
    const row = (await pool.query(`UPDATE puja_pricing_rules SET puja_id=$1,name=$2,within_hours=$3,
      mode=$4,value=$5,customer_message=$6,enabled=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
      [rule.pujaId,rule.name,rule.withinHours,rule.mode,rule.value,rule.customerMessage,rule.enabled,id])).rows[0];
    if (!row) return res.status(404).json({ message: 'Pricing rule not found.' });
    res.json(mapPricingRule(row));
  } catch (error) { errorResponse(res, error); }
});
adminPricingRouter.delete('/rules/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM puja_pricing_rules WHERE id=$1 RETURNING id', [idOf(req.params)]);
    if (!result.rowCount) return res.status(404).json({ message: 'Pricing rule not found.' });
    res.status(204).end();
  } catch (error) { errorResponse(res, error); }
});

export const adminPujaPriceRouter = Router();
adminPujaPriceRouter.use(requirePricingAdmin);
adminPujaPriceRouter.post('/:id/adjust-price', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = idOf(req.params);
    const input = z.object({
      mode: z.enum(['percent','amount','fixed']), value: z.number().finite().min(-100_000_000).max(100_000_000),
      expectedPrice: z.number().int().nonnegative(),
    }).parse(req.body);
    if (input.mode === 'percent' && (input.value <= -100 || input.value > 10000)) throw new RangeError('Percentage must be greater than -100 and at most 10000.');
    if (input.mode !== 'percent' && !Number.isInteger(input.value)) throw new RangeError('Use whole rupees.');
    await client.query('BEGIN');
    const puja = (await client.query('SELECT * FROM pujas WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!puja) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Puja not found.' }); }
    const current = Number(puja.price ?? puja.basePrice);
    if (current !== input.expectedPrice) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'The regular price has changed. Refresh and review it before adjusting again.' });
    }
    const price = adjustedPrice(current, input.mode, input.value);
    const rules = (await client.query('SELECT * FROM puja_pricing_rules WHERE enabled=true AND (puja_id IS NULL OR puja_id=$1)', [id])).rows;
    for (const r of rules) adjustedPrice(price, r.mode, Number(r.value));
    const row = (await client.query('UPDATE pujas SET price=$1,"updatedAt"=NOW() WHERE id=$2 RETURNING *', [price,id])).rows[0];
    await client.query('COMMIT');
    res.json(row);
  } catch (error) { await client.query('ROLLBACK'); errorResponse(res, error); }
  finally { client.release(); }
});
