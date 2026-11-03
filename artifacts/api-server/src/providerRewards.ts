import { pool } from './db';

export type RewardAudience = 'all' | 'guruji' | 'other_category';
export type RewardType = 'cash_bonus' | 'voucher' | 'gift';
export type RewardAwardStatus = 'none' | 'eligible' | 'issued';

export type ProviderRewardOffer = {
  id: number;
  title: string;
  description: string;
  rewardType: RewardType;
  rewardLabel: string;
  rewardAmount: number | null;
  audience: RewardAudience;
  windowDays: number;
  minCompletedBookings: number;
  minAverageRating: number | null;
  minRatingCount: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProviderRewardProgress = {
  profileId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  accountType: 'guruji' | 'other_category';
  categories: string[];
  completedBookings: number;
  averageRating: number;
  ratingCount: number;
  isEligible: boolean;
  awardStatus: RewardAwardStatus;
  awardId: number | null;
  eligibleAt: Date | null;
  issuedAt: Date | null;
  issuedBy: number | null;
  fulfillmentReference: string | null;
  note: string | null;
};

function dateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

export function mapProviderRewardOffer(row: any): ProviderRewardOffer {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description ?? '',
    rewardType: row.reward_type,
    rewardLabel: row.reward_label,
    rewardAmount: row.reward_amount == null ? null : Number(row.reward_amount),
    audience: row.audience,
    windowDays: Number(row.window_days),
    minCompletedBookings: Number(row.min_completed_bookings),
    minAverageRating: row.min_average_rating == null ? null : Number(row.min_average_rating),
    minRatingCount: row.min_rating_count == null ? null : Number(row.min_rating_count),
    startsAt: dateValue(row.starts_at),
    endsAt: dateValue(row.ends_at),
    isActive: row.is_active === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rewardCriteriaMet(
  offer: Pick<ProviderRewardOffer, 'minCompletedBookings' | 'minAverageRating' | 'minRatingCount'>,
  progress: Pick<ProviderRewardProgress, 'completedBookings' | 'averageRating' | 'ratingCount'>,
): boolean {
  const completedMet = offer.minCompletedBookings <= 0 ||
    progress.completedBookings >= offer.minCompletedBookings;
  const ratingMet = offer.minAverageRating == null ||
    (progress.ratingCount >= (offer.minRatingCount ?? 1) &&
      progress.averageRating >= offer.minAverageRating);
  return completedMet && ratingMet;
}

export async function initializeProviderRewards() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_reward_offers (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      reward_type TEXT NOT NULL CHECK (reward_type IN ('cash_bonus','voucher','gift')),
      reward_label TEXT NOT NULL,
      reward_amount NUMERIC(12,2),
      audience TEXT NOT NULL CHECK (audience IN ('all','guruji','other_category')),
      window_days INTEGER NOT NULL CHECK (window_days BETWEEN 1 AND 365),
      min_completed_bookings INTEGER NOT NULL DEFAULT 0 CHECK (min_completed_bookings BETWEEN 0 AND 10000),
      min_average_rating NUMERIC(3,2) CHECK (min_average_rating BETWEEN 1 AND 5),
      min_rating_count INTEGER CHECK (min_rating_count BETWEEN 1 AND 10000),
      starts_at DATE NOT NULL,
      ends_at DATE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (ends_at >= starts_at),
      CHECK (min_completed_bookings > 0 OR min_average_rating IS NOT NULL),
      CHECK (min_average_rating IS NOT NULL OR min_rating_count IS NULL),
      CHECK (reward_amount IS NULL OR reward_amount >= 0)
    );
    CREATE INDEX IF NOT EXISTS provider_reward_offers_active_period_idx
      ON provider_reward_offers(is_active, starts_at, ends_at);
    CREATE TABLE IF NOT EXISTS provider_reward_awards (
      id BIGSERIAL PRIMARY KEY,
      offer_id INTEGER NOT NULL REFERENCES provider_reward_offers(id) ON DELETE RESTRICT,
      profile_id INTEGER NOT NULL REFERENCES guruji_profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible','issued')),
      eligible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_bookings_snapshot INTEGER NOT NULL,
      average_rating_snapshot NUMERIC(4,2) NOT NULL,
      rating_count_snapshot INTEGER NOT NULL,
      issued_at TIMESTAMPTZ,
      issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      fulfillment_reference TEXT,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(offer_id, profile_id)
    );
    CREATE INDEX IF NOT EXISTS provider_reward_awards_profile_idx
      ON provider_reward_awards(profile_id, eligible_at DESC);
  `);
}

export async function getRewardOffers() {
  const result = await pool.query(
    `SELECT * FROM provider_reward_offers ORDER BY created_at DESC, id DESC`,
  );
  return result.rows.map(mapProviderRewardOffer);
}

export async function getRewardOffer(id: number) {
  const result = await pool.query(`SELECT * FROM provider_reward_offers WHERE id=$1`, [id]);
  return result.rows[0] ? mapProviderRewardOffer(result.rows[0]) : null;
}

export async function isRewardOfferCurrent(offerId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT is_active AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date BETWEEN starts_at AND ends_at AS current
     FROM provider_reward_offers WHERE id=$1`,
    [offerId],
  );
  return result.rows[0]?.current === true;
}

export async function getProviderRewardProgress(
  offer: ProviderRewardOffer,
  profileId?: number,
): Promise<ProviderRewardProgress[]> {
  const result = await pool.query(
    `SELECT
       gp.id AS "profileId",
       u.id AS "userId",
       COALESCE(u."firstName",'') AS "firstName",
       COALESCE(u."lastName",'') AS "lastName",
       u.email,
       CASE WHEN u.role='guruji' THEN 'guruji' ELSE 'other_category' END AS "accountType",
       COALESCE(category_list.categories, ARRAY[]::text[]) AS categories,
       COALESCE(booking_progress.completed_bookings,0)::int AS "completedBookings",
       COALESCE(rating_progress.average_rating,0)::numeric(5,2) AS "averageRating",
       COALESCE(rating_progress.rating_count,0)::int AS "ratingCount",
       award.id AS "awardId",
       award.status AS "awardStatus",
       award.eligible_at AS "eligibleAt",
       award.issued_at AS "issuedAt",
       award.issued_by AS "issuedBy",
       award.fulfillment_reference AS "fulfillmentReference",
       award.note
     FROM guruji_profiles gp
     JOIN users u ON u.id=gp."userId"
     LEFT JOIN LATERAL (
       SELECT array_agg(DISTINCT c.name ORDER BY c.name) AS categories
       FROM other_category_applications a
       JOIN other_registration_categories c ON c.id=a.category_id
       WHERE a.profile_id=gp.id AND a.user_id=u.id AND a.status='approved' AND c.is_active=true
     ) category_list ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS completed_bookings
       FROM bookings b
       LEFT JOIN booking_completion_challenges completion ON completion.booking_id=b.id
       WHERE b."gurujiId"=gp.id AND b.status='completed'
         AND COALESCE(completion.completed_at,b."updatedAt",b."createdAt")
           >= NOW() - make_interval(days => $1::int)
         AND COALESCE(completion.completed_at,b."updatedAt",b."createdAt") <= NOW()
     ) booking_progress ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS rating_count, COALESCE(AVG(r.rating),0)::numeric(5,2) AS average_rating
       FROM reviews r
       WHERE r."gurujiId"=gp.id AND r.from_role='customer'
         AND r."createdAt" >= NOW() - make_interval(days => $1::int)
         AND r."createdAt" <= NOW()
     ) rating_progress ON TRUE
     LEFT JOIN provider_reward_awards award ON award.offer_id=$2 AND award.profile_id=gp.id
     WHERE u."isBlocked" IS NOT TRUE
       AND ($4::int IS NULL OR gp.id=$4)
       AND (
         (u.role='guruji' AND gp.status='approved')
         OR (u.role='customer' AND EXISTS (
           SELECT 1 FROM other_category_applications active_application
           JOIN other_registration_categories active_category
             ON active_category.id=active_application.category_id
           WHERE active_application.user_id=u.id AND active_application.profile_id=gp.id
             AND active_application.status='approved' AND active_category.is_active=true
         ))
       )
       AND (
         $3::text='all'
         OR ($3::text='guruji' AND u.role='guruji')
         OR ($3::text='other_category' AND u.role='customer' AND EXISTS (
           SELECT 1 FROM other_category_applications audience_application
           JOIN other_registration_categories audience_category
             ON audience_category.id=audience_application.category_id
           WHERE audience_application.user_id=u.id AND audience_application.profile_id=gp.id
             AND audience_application.status='approved' AND audience_category.is_active=true
         ))
       )
     ORDER BY u."firstName", u."lastName", gp.id`,
    [offer.windowDays, offer.id, offer.audience, profileId ?? null],
  );

  return result.rows.map((row: any) => {
    const progress = {
      profileId: Number(row.profileId),
      userId: Number(row.userId),
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      email: row.email ?? '',
      accountType: row.accountType,
      categories: Array.isArray(row.categories) ? row.categories : [],
      completedBookings: Number(row.completedBookings),
      averageRating: Number(row.averageRating),
      ratingCount: Number(row.ratingCount),
      isEligible: false,
      awardStatus: (row.awardStatus ?? 'none') as RewardAwardStatus,
      awardId: row.awardId == null ? null : Number(row.awardId),
      eligibleAt: row.eligibleAt ?? null,
      issuedAt: row.issuedAt ?? null,
      issuedBy: row.issuedBy == null ? null : Number(row.issuedBy),
      fulfillmentReference: row.fulfillmentReference ?? null,
      note: row.note ?? null,
    } satisfies ProviderRewardProgress;
    progress.isEligible = progress.awardStatus !== 'none' ||
      rewardCriteriaMet(offer, progress);
    return progress;
  });
}

async function recordEligibleProviders(
  offer: ProviderRewardOffer,
  profileId?: number,
) {
  if (!(await isRewardOfferCurrent(offer.id))) return;
  const providers = await getProviderRewardProgress(offer, profileId);
  for (const provider of providers) {
    if (!rewardCriteriaMet(offer, provider) || provider.awardStatus !== 'none') continue;
    await pool.query(
      `INSERT INTO provider_reward_awards
         (offer_id,profile_id,status,completed_bookings_snapshot,average_rating_snapshot,rating_count_snapshot)
       VALUES ($1,$2,'eligible',$3,$4,$5)
       ON CONFLICT (offer_id,profile_id) DO NOTHING`,
      [offer.id, provider.profileId, provider.completedBookings, provider.averageRating, provider.ratingCount],
    );
  }
}

export async function reconcileProviderRewardEligibility(profileId: number) {
  const offers = await getRewardOffers();
  for (const offer of offers) {
    if (offer.isActive) await recordEligibleProviders(offer, profileId);
  }
}

export async function reconcileAllProviderRewardEligibility() {
  const offers = await getRewardOffers();
  for (const offer of offers) {
    if (offer.isActive) await recordEligibleProviders(offer);
  }
}

export async function getProviderRewardsForUser(userId: number) {
  const profileResult = await pool.query(
    `SELECT gp.id,u.role,gp.status
     FROM guruji_profiles gp JOIN users u ON u.id=gp."userId"
     WHERE u.id=$1 AND u."isBlocked" IS NOT TRUE
       AND (
         (u.role='guruji' AND gp.status='approved')
         OR (u.role='customer' AND EXISTS (
           SELECT 1 FROM other_category_applications a
           JOIN other_registration_categories c ON c.id=a.category_id
           WHERE a.user_id=u.id AND a.profile_id=gp.id
             AND a.status='approved' AND c.is_active=true
         ))
       )
     LIMIT 1`,
    [userId],
  );
  const profileId = profileResult.rows[0]?.id ? Number(profileResult.rows[0].id) : null;
  if (!profileId) return null;

  await reconcileProviderRewardEligibility(profileId);
  const offers = await getRewardOffers();
  const visibleOffers = [];
  for (const offer of offers) {
    const [progress] = await getProviderRewardProgress(offer, profileId);
    if (!progress) continue;
    const offerCurrent = offer.isActive && await isRewardOfferCurrent(offer.id);
    if (!offerCurrent && progress.awardStatus === 'none') continue;
    visibleOffers.push({
      offer,
      completedBookings: progress.completedBookings,
      averageRating: progress.averageRating,
      ratingCount: progress.ratingCount,
      isEligible: progress.isEligible,
      awardStatus: progress.awardStatus,
      eligibleAt: progress.eligibleAt,
      issuedAt: progress.issuedAt,
      fulfillmentReference: progress.fulfillmentReference,
    });
  }
  return { offers: visibleOffers };
}

let rewardScheduler: NodeJS.Timeout | null = null;

export function startProviderRewardsScheduler() {
  if (rewardScheduler) return;
  const run = () => {
    void reconcileAllProviderRewardEligibility().catch(error => {
      console.error('Provider reward eligibility reconciliation failed:', error);
    });
  };
  run();
  rewardScheduler = setInterval(run, 5 * 60 * 1000);
  rewardScheduler.unref?.();
}
