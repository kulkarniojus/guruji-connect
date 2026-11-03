import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { checkRole, checkSuperAdmin, isAuthenticated } from '../middlewares/auth';
import {
  getProviderRewardProgress,
  getProviderRewardsForUser,
  getRewardOffer,
  getRewardOffers,
  initializeProviderRewards,
  isRewardOfferCurrent,
  mapProviderRewardOffer,
  reconcileAllProviderRewardEligibility,
  rewardCriteriaMet,
  startProviderRewardsScheduler,
} from '../providerRewards';

export { initializeProviderRewards, startProviderRewardsScheduler };

export const providerRewardsRouter = Router();

const offerInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1200),
  rewardType: z.enum(['cash_bonus', 'voucher', 'gift']),
  rewardLabel: z.string().trim().min(1).max(120),
  rewardAmount: z.number().finite().nonnegative().nullable(),
  audience: z.enum(['all', 'guruji', 'other_category']),
  windowDays: z.number().int().min(1).max(365),
  minCompletedBookings: z.number().int().min(0).max(10000),
  minAverageRating: z.number().min(1).max(5).nullable(),
  minRatingCount: z.number().int().min(1).max(10000).nullable(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for the start date'),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for the end date'),
  isActive: z.boolean(),
}).superRefine((offer, ctx) => {
  const dateIsValid = (value: string) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!dateIsValid(offer.startsAt)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Start date is invalid',
  });
  if (!dateIsValid(offer.endsAt)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date is invalid',
  });
  if (offer.endsAt < offer.startsAt) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be on or after the start date',
  });
  if (offer.minCompletedBookings === 0 && offer.minAverageRating == null) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['minCompletedBookings'],
    message: 'Set a completed-booking or average-rating target',
  });
  if (offer.minAverageRating == null && offer.minRatingCount != null) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['minRatingCount'],
    message: 'A minimum rating count requires an average-rating target',
  });
  if (offer.rewardType === 'cash_bonus' && (offer.rewardAmount == null || offer.rewardAmount <= 0)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['rewardAmount'],
    message: 'Enter a cash bonus amount greater than zero',
  });
});

const issueInputSchema = z.object({
  profileId: z.number().int().positive(),
  fulfillmentReference: z.string().trim().min(1).max(240),
  note: z.string().trim().max(1000).optional(),
});

const offerValues = (input: z.infer<typeof offerInputSchema>) => [
  input.title,
  input.description,
  input.rewardType,
  input.rewardLabel,
  input.rewardAmount,
  input.audience,
  input.windowDays,
  input.minCompletedBookings,
  input.minAverageRating,
  input.minAverageRating == null ? null : (input.minRatingCount ?? 1),
  input.startsAt,
  input.endsAt,
  input.isActive,
];

providerRewardsRouter.use('/api/admin/provider-rewards', isAuthenticated, checkRole(['admin']));

providerRewardsRouter.get('/api/admin/provider-rewards', async (_req: Request, res: Response) => {
  try {
    await reconcileAllProviderRewardEligibility();
    const offers = await getRewardOffers();
    const response = [];
    for (const offer of offers) {
      const current = offer.isActive && await isRewardOfferCurrent(offer.id);
      const providers = await getProviderRewardProgress(offer);
      response.push({
        offer,
        providers: providers.map(provider => ({
          profileId: provider.profileId,
          userId: provider.userId,
          firstName: provider.firstName,
          lastName: provider.lastName,
          email: provider.email,
          accountType: provider.accountType,
          categories: provider.categories,
          completedBookings: provider.completedBookings,
          averageRating: provider.averageRating,
          ratingCount: provider.ratingCount,
          isEligible: provider.awardStatus !== 'none' ||
            (current && rewardCriteriaMet(offer, provider)),
          awardStatus: provider.awardStatus,
          awardId: provider.awardId,
          eligibleAt: provider.eligibleAt,
          issuedAt: provider.issuedAt,
          fulfillmentReference: provider.fulfillmentReference,
        })),
      });
    }
    return res.json({ offers: response });
  } catch (error) {
    console.error('Unable to load provider rewards for admin:', error);
    return res.status(500).json({ message: 'Could not load provider rewards' });
  }
});

providerRewardsRouter.post('/api/admin/provider-rewards', async (req: Request, res: Response) => {
  const parsed = offerInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(issue => issue.message).join('; ') });
  try {
    const result = await pool.query(
      `INSERT INTO provider_reward_offers
         (title,description,reward_type,reward_label,reward_amount,audience,window_days,
          min_completed_bookings,min_average_rating,min_rating_count,starts_at,ends_at,is_active,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12::date,$13,$14,$14)
       RETURNING *`,
      [...offerValues(parsed.data), req.session.userId],
    );
    return res.status(201).json(mapProviderRewardOffer(result.rows[0]));
  } catch (error) {
    console.error('Unable to create provider reward offer:', error);
    return res.status(500).json({ message: 'Could not create provider reward offer' });
  }
});

providerRewardsRouter.put('/api/admin/provider-rewards/:offerId', async (req: Request, res: Response) => {
  const id = Number(req.params.offerId);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid offer ID' });
  const parsed = offerInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(issue => issue.message).join('; ') });
  try {
    const result = await pool.query(
      `UPDATE provider_reward_offers SET
         title=$2,description=$3,reward_type=$4,reward_label=$5,reward_amount=$6,audience=$7,
         window_days=$8,min_completed_bookings=$9,min_average_rating=$10,min_rating_count=$11,
         starts_at=$12::date,ends_at=$13::date,is_active=$14,updated_by=$15,updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, ...offerValues(parsed.data).slice(0, 13), req.session.userId],
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Reward offer not found' });
    return res.json(mapProviderRewardOffer(result.rows[0]));
  } catch (error) {
    console.error('Unable to update provider reward offer:', error);
    return res.status(500).json({ message: 'Could not update provider reward offer' });
  }
});

providerRewardsRouter.delete('/api/admin/provider-rewards/:offerId', async (req: Request, res: Response) => {
  const id = Number(req.params.offerId);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid offer ID' });
  try {
    const result = await pool.query(
      `UPDATE provider_reward_offers SET is_active=false,updated_by=$2,updated_at=NOW()
       WHERE id=$1 RETURNING id`,
      [id, req.session.userId],
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Reward offer not found' });
    return res.json({ message: 'Offer deactivated; previously earned rewards are preserved' });
  } catch (error) {
    console.error('Unable to deactivate provider reward offer:', error);
    return res.status(500).json({ message: 'Could not deactivate provider reward offer' });
  }
});

providerRewardsRouter.post(
  '/api/admin/provider-rewards/:offerId/issue',
  checkSuperAdmin,
  async (req: Request, res: Response) => {
    const offerId = Number(req.params.offerId);
    if (!Number.isInteger(offerId) || offerId < 1) return res.status(400).json({ message: 'Invalid offer ID' });
    const parsed = issueInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(issue => issue.message).join('; ') });
    try {
      const offer = await getRewardOffer(offerId);
      if (!offer) return res.status(404).json({ message: 'Reward offer not found' });
      let award = (await pool.query(
        `SELECT * FROM provider_reward_awards WHERE offer_id=$1 AND profile_id=$2`,
        [offerId, parsed.data.profileId],
      )).rows[0];

      if (!award) {
        const active = await isRewardOfferCurrent(offerId);
        const [provider] = await getProviderRewardProgress(offer, parsed.data.profileId);
        if (!active || !provider || !rewardCriteriaMet(offer, provider)) {
          return res.status(409).json({ message: 'This provider has not earned the reward' });
        }
        award = (await pool.query(
          `INSERT INTO provider_reward_awards
             (offer_id,profile_id,status,completed_bookings_snapshot,average_rating_snapshot,rating_count_snapshot)
           VALUES ($1,$2,'eligible',$3,$4,$5)
           ON CONFLICT (offer_id,profile_id) DO UPDATE SET offer_id=EXCLUDED.offer_id
           RETURNING *`,
          [offerId, provider.profileId, provider.completedBookings, provider.averageRating, provider.ratingCount],
        )).rows[0];
      }
      if (award.status !== 'eligible') return res.status(409).json({ message: 'This reward has already been issued' });

      const updated = await pool.query(
        `UPDATE provider_reward_awards SET status='issued',issued_at=NOW(),issued_by=$3,
           fulfillment_reference=$4,note=$5,updated_at=NOW()
         WHERE offer_id=$1 AND profile_id=$2 AND status='eligible'
         RETURNING id,offer_id AS "offerId",profile_id AS "profileId",status,eligible_at AS "eligibleAt",
           issued_at AS "issuedAt",issued_by AS "issuedBy",fulfillment_reference AS "fulfillmentReference",note`,
        [offerId, parsed.data.profileId, req.session.userId, parsed.data.fulfillmentReference, parsed.data.note ?? null],
      );
      if (!updated.rows[0]) return res.status(409).json({ message: 'This reward has already been issued' });
      return res.status(201).json(updated.rows[0]);
    } catch (error) {
      console.error('Unable to record provider reward delivery:', error);
      return res.status(500).json({ message: 'Could not record reward delivery' });
    }
  },
);

providerRewardsRouter.get('/api/provider/rewards', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const rewards = await getProviderRewardsForUser(req.session.userId!);
    if (!rewards) return res.status(403).json({ message: 'Approved service provider access required' });
    return res.json(rewards);
  } catch (error) {
    console.error('Unable to load provider rewards:', error);
    return res.status(500).json({ message: 'Could not load provider rewards' });
  }
});
