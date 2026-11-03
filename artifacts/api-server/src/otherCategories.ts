import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { DBStorage } from './dbStorage';
import { isAuthenticated, checkRole } from './middlewares/auth';

const categoryInput = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  basePrice: z.coerce.number().int().min(1).max(1_000_000),
  duration: z.coerce.number().int().min(1).max(1440).default(60),
  isActive: z.boolean().default(true),
});

const applicationInput = z.object({
  categoryIds: z.array(z.coerce.number().int().positive()).min(1).max(20),
  serviceCities: z.array(z.string().trim().min(1)).optional(),
  languages: z.array(z.string().trim().min(1)).optional(),
  bio: z.string().trim().max(1000).optional(),
  experience: z.coerce.number().int().min(0).max(100).optional(),
  pricePerHour: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export async function initializeOtherCategories() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS other_registration_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      puja_id INTEGER NOT NULL UNIQUE REFERENCES pujas(id) ON DELETE RESTRICT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS other_category_applications (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES guruji_profiles(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES other_registration_categories(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      rejection_reason TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by INTEGER REFERENCES users(id),
      UNIQUE(user_id,category_id)
    );
    CREATE INDEX IF NOT EXISTS other_category_applications_review
      ON other_category_applications(status, applied_at DESC);
    CREATE INDEX IF NOT EXISTS other_category_applications_profile
      ON other_category_applications(profile_id, status);
  `);
}

async function writeApplication(
  client: any,
  userId: number,
  input: z.infer<typeof applicationInput>,
) {
  const user = (await client.query(`SELECT * FROM users WHERE id=$1 AND "isBlocked"=false FOR UPDATE`, [userId])).rows[0];
  if (!user || !['customer', 'guruji'].includes(user.role)) {
    throw Object.assign(new Error('Only customer and Guruji accounts can apply'), { status: 403 });
  }
  const categories = (await client.query(
    `SELECT id FROM other_registration_categories WHERE id=ANY($1::int[]) AND is_active=true`,
    [Array.from(new Set(input.categoryIds))],
  )).rows;
  if (categories.length !== new Set(input.categoryIds).size) {
    throw Object.assign(new Error('One or more selected categories are inactive or unavailable'), { status: 400 });
  }

  let cities = input.serviceCities?.length ? input.serviceCities : (user.city ? [user.city] : []);
  const cityRows = cities.length ? (await client.query(
    `SELECT id,name FROM cities WHERE "isActive"=true AND
     (id::text=ANY($1::text[]) OR LOWER(name)=ANY($2::text[]))`,
    [cities, cities.map(value => value.toLocaleLowerCase('en-IN'))],
  )).rows : [];
  if (!cities.length || cityRows.length !== new Set(cities.map(value => value.toLowerCase())).size) {
    throw Object.assign(new Error('Select at least one active service city'), { status: 400 });
  }
  cities = cities.map(value => cityRows.find((row: any) =>
    String(row.id) === value || row.name.toLocaleLowerCase('en-IN') === value.toLocaleLowerCase('en-IN'))?.name)
    .filter(Boolean) as string[];

  let profile = (await client.query(`SELECT * FROM guruji_profiles WHERE "userId"=$1 FOR UPDATE`, [userId])).rows[0];
  const fallbackCity = cities[0] || user.city || '';
  if (!profile) {
    profile = (await client.query(
      `INSERT INTO guruji_profiles
        ("userId",description,city,address,state,pincode,experience,"pricePerHour","isVerified","isAvailable",
         languages,specialities,rating,"totalReviews",aadhar_verified,documents_verified,certificates,
         profile_picture_url,status,cities,"createdAt","updatedAt","isOnline","isOffline","isConsultation")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,false,$9,ARRAY[]::text[],0,0,false,false,ARRAY[]::text[],
         $10,'pending',$11,NOW(),NOW(),false,true,false) RETURNING *`,
      [userId, input.bio || '', fallbackCity, user.address || null, user.state || null, user.pincode || null,
        input.experience ?? 0, input.pricePerHour ?? 0, input.languages || [], user.photo_url || null, cities],
    )).rows[0];
  } else if (user.role === 'customer') {
    await client.query(
      `UPDATE guruji_profiles SET description=COALESCE($2,description),cities=$3,
        city=COALESCE(NULLIF(city,''),$4),address=COALESCE(address,$5),state=COALESCE(state,$6),
        pincode=COALESCE(pincode,$7),experience=COALESCE($8,experience),
        "pricePerHour"=COALESCE($9,"pricePerHour"),languages=CASE WHEN $10::text[] IS NULL THEN languages ELSE $10 END,
        "updatedAt"=NOW() WHERE id=$1`,
      [profile.id, input.bio ?? null, cities, fallbackCity, user.address || null, user.state || null,
        user.pincode || null, input.experience ?? null, input.pricePerHour ?? null, input.languages ?? null],
    );
  }

  const results = [];
  for (const categoryId of Array.from(new Set(input.categoryIds))) {
    const result = await client.query(
      `INSERT INTO other_category_applications(user_id,profile_id,category_id,status)
       VALUES($1,$2,$3,'pending')
       ON CONFLICT(user_id,category_id) DO UPDATE SET
         status=CASE WHEN other_category_applications.status='approved' THEN 'approved' ELSE 'pending' END,
         rejection_reason=NULL,applied_at=CASE WHEN other_category_applications.status='approved'
            THEN other_category_applications.applied_at ELSE NOW() END,
          reviewed_at=CASE WHEN other_category_applications.status='approved'
            THEN other_category_applications.reviewed_at ELSE NULL END,
          reviewed_by=CASE WHEN other_category_applications.status='approved'
            THEN other_category_applications.reviewed_by ELSE NULL END
       RETURNING id,category_id,status`,
      [userId, profile.id, categoryId],
    );
    results.push(result.rows[0]);
  }

  const pendingCategoryIds = results.filter((application: any) => application.status === 'pending')
    .map((application: any) => Number(application.category_id));
  if (pendingCategoryIds.length) {
    const admins = (await client.query(`SELECT id FROM users WHERE role='admin' AND "isBlocked"=false`)).rows;
    const names = (await client.query(
      `SELECT string_agg(name, ', ' ORDER BY name) AS names FROM other_registration_categories WHERE id=ANY($1::int[])`,
      [pendingCategoryIds],
    )).rows[0]?.names || 'Other categories';
    for (const admin of admins) {
      await client.query(`INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
        VALUES($1,$2,$3,$4,false,NOW())`,
        [admin.id, 'Other-category application', `${user["firstName"]} ${user["lastName"]} applied for: ${names}.`,
          'other_category_application']);
    }
  }
  return { profileId: profile.id, applications: results };
}

export async function addOtherCategoryApplications(
  client: any,
  userId: number,
  categoryIds: unknown,
  serviceCities?: unknown,
) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return null;
  const input = applicationInput.parse({
    categoryIds,
    serviceCities: Array.isArray(serviceCities) ? serviceCities.map(String) : undefined,
  });
  return writeApplication(client, userId, input);
}

export async function getApprovedOtherCategoryPujaIds(client: any, profileId: number): Promise<Set<number>> {
  const result = await client.query(
    `SELECT c.puja_id AS "pujaId"
     FROM other_category_applications a
     JOIN other_registration_categories c ON c.id=a.category_id
     WHERE a.profile_id=$1 AND a.status='approved'`,
    [profileId],
  );
  return new Set<number>(result.rows.map((row: any) => Number(row.pujaId)));
}

export async function hasApprovedOtherCategoryForPuja(client: any, profileId: number, pujaId: number): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM other_category_applications a
     JOIN other_registration_categories c ON c.id=a.category_id
     WHERE a.profile_id=$1 AND a.status='approved' AND c.puja_id=$2
     LIMIT 1`,
    [profileId, pujaId],
  );
  return result.rows.length > 0;
}

export const otherCategoriesRouter = Router();
otherCategoriesRouter.get('/other-categories', async (_req, res) => {
  const result = await pool.query(
    `SELECT c.id,c.name,c.description,c.puja_id AS "pujaId",c.is_active AS "isActive",
       p."basePrice" AS "basePrice",p.duration
     FROM other_registration_categories c JOIN pujas p ON p.id=c.puja_id
     WHERE c.is_active=true ORDER BY c.name`,
  );
  return res.json(result.rows);
});
otherCategoriesRouter.get('/other-categories/my-applications', isAuthenticated, async (req, res) => {
  const result = await pool.query(
    `SELECT c.id AS "categoryId",c.name,c.description,c.is_active AS "isActive",p."basePrice" AS "basePrice",
       a.status,a.rejection_reason AS "rejectionReason",a.applied_at AS "appliedAt",
       gp.id AS "profileId",gp.city,gp.cities AS "serviceCities",gp.languages,gp.description AS bio,
       gp.experience,gp."pricePerHour" AS "pricePerHour",gp."isAvailable" AS "isAvailable"
     FROM other_category_applications a
     JOIN other_registration_categories c ON c.id=a.category_id
     JOIN pujas p ON p.id=c.puja_id
     JOIN guruji_profiles gp ON gp.id=a.profile_id
     WHERE a.user_id=$1 ORDER BY a.applied_at DESC,c.name`,
    [req.session.userId],
  );
  return res.json(result.rows);
});
otherCategoriesRouter.post('/other-categories/apply', isAuthenticated, async (req, res) => {
  const parsed = applicationInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await writeApplication(client, req.session.userId!, parsed.data);
    await client.query('COMMIT');
    const hasPending = result.applications.some((application: any) => application.status === 'pending');
    return res.status(201).json({
      ...result,
      message: hasPending ? 'Application submitted for admin approval' : 'Your selected categories are already approved',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to submit category application' });
  } finally {
    client.release();
  }
});

export const adminOtherCategoriesRouter = Router();
adminOtherCategoriesRouter.use(isAuthenticated, checkRole(['admin']));
adminOtherCategoriesRouter.get('/other-categories', async (_req, res) => {
  const categories = await pool.query(
    `SELECT c.id,c.name,c.description,c.is_active AS "isActive",c.puja_id AS "pujaId",
       p."basePrice" AS "basePrice",p.duration,c.created_at AS "createdAt"
     FROM other_registration_categories c JOIN pujas p ON p.id=c.puja_id ORDER BY c.created_at DESC`,
  );
  return res.json(categories.rows);
});
adminOtherCategoriesRouter.post('/other-categories', async (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = parsed.data;
    const puja = (await client.query(
      `INSERT INTO pujas(name,description,"basePrice",price,type,duration,items,"isPopular","isActive","createdAt","updatedAt")
       VALUES($1,$2,$3,$3,'offline',$4,ARRAY[]::text[],false,$5,NOW(),NOW()) RETURNING id`,
      [value.name, value.description, value.basePrice, value.duration, value.isActive],
    )).rows[0];
    const category = (await client.query(
      `INSERT INTO other_registration_categories(name,description,puja_id,is_active)
       VALUES($1,$2,$3,$4) RETURNING id,name,description,puja_id AS "pujaId",is_active AS "isActive"`,
      [value.name, value.description, puja.id, value.isActive],
    )).rows[0];
    await client.query('COMMIT');
    return res.status(201).json({ ...category, basePrice: value.basePrice, duration: value.duration });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(error.code === '23505' ? 409 : 500).json({
      message: error.code === '23505' ? 'A category with this name already exists' : 'Unable to create category',
    });
  } finally {
    client.release();
  }
});
adminOtherCategoriesRouter.put('/other-categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid category ID' });
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(`SELECT * FROM other_registration_categories WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Category not found' });
    }
    const value = parsed.data;
    await client.query(
      `UPDATE other_registration_categories SET name=$2,description=$3,is_active=$4,updated_at=NOW() WHERE id=$1`,
      [id, value.name, value.description, value.isActive],
    );
    await client.query(
      `UPDATE pujas SET name=$2,description=$3,"basePrice"=$4,price=$4,duration=$5,"isActive"=$6,"updatedAt"=NOW()
       WHERE id=$1`,
      [current.puja_id, value.name, value.description, value.basePrice, value.duration, value.isActive],
    );
    await client.query('COMMIT');
    return res.json({ id, name: value.name, description: value.description, isActive: value.isActive,
      pujaId: current.puja_id, basePrice: value.basePrice, duration: value.duration });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(error.code === '23505' ? 409 : 500).json({
      message: error.code === '23505' ? 'A category with this name already exists' : 'Unable to update category',
    });
  } finally {
    client.release();
  }
});
adminOtherCategoriesRouter.delete('/other-categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid category ID' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const category = (await client.query(`SELECT * FROM other_registration_categories WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!category) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Category not found' });
    }
    const references = (await client.query(
      `SELECT
        EXISTS(SELECT 1 FROM other_category_applications WHERE category_id=$1) AS has_applications,
        EXISTS(SELECT 1 FROM bookings WHERE "pujaId"=$2) AS has_bookings`,
      [id, category.puja_id],
    )).rows[0];
    if (references.has_applications || references.has_bookings) {
      await client.query(`UPDATE other_registration_categories SET is_active=false,updated_at=NOW() WHERE id=$1`, [id]);
      await client.query(`UPDATE pujas SET "isActive"=false,"updatedAt"=NOW() WHERE id=$1`, [category.puja_id]);
      await client.query('COMMIT');
      return res.json({ message: 'Category deactivated because it has application or booking history.' });
    }
    await client.query(`DELETE FROM other_registration_categories WHERE id=$1`, [id]);
    await client.query(`DELETE FROM pujas WHERE id=$1`, [category.puja_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Category deleted' });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to delete category' });
  } finally {
    client.release();
  }
});
adminOtherCategoriesRouter.get('/other-category-applications', async (req, res) => {
  const status = z.enum(['pending', 'approved', 'rejected', 'all']).catch('pending').parse(req.query.status);
  const result = await pool.query(
    `SELECT a.id,a.status,a.applied_at AS "appliedAt",a.rejection_reason AS "rejectionReason",
       c.id AS "categoryId",c.name AS "categoryName",c.is_active AS "categoryActive",
       u.id AS "userId",u.role AS "accountRole",u."firstName",u."lastName",u.email,u.mobile,u.city,u.state,
       gp.id AS "profileId",gp.city AS "serviceCity",gp.cities AS "serviceCities",gp.address,gp.pincode,
       gp.description AS bio,gp.experience,gp.languages,gp."pricePerHour" AS "pricePerHour"
     FROM other_category_applications a
     JOIN other_registration_categories c ON c.id=a.category_id
     JOIN users u ON u.id=a.user_id
     JOIN guruji_profiles gp ON gp.id=a.profile_id
     WHERE ($1='all' OR a.status=$1)
     ORDER BY (a.status='pending') DESC,a.applied_at DESC`,
    [status],
  );
  return res.json(result.rows);
});
adminOtherCategoriesRouter.put('/other-category-applications/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid application ID' });
  const parsed = z.object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  if (parsed.data.status === 'rejected' && !parsed.data.rejectionReason?.trim()) {
    return res.status(400).json({ message: 'Add a reason when rejecting an application' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const application = (await client.query(
      `SELECT * FROM other_category_applications WHERE id=$1 FOR UPDATE`, [id],
    )).rows[0];
    if (!application) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Application not found' });
    }
    await client.query(
      `UPDATE other_category_applications SET status=$2,rejection_reason=$3,reviewed_at=NOW(),reviewed_by=$4
       WHERE id=$1`,
      [id, parsed.data.status, parsed.data.rejectionReason || null, req.session.userId],
    );
    const approved = (await client.query(
      `SELECT 1 FROM other_category_applications WHERE profile_id=$1 AND status='approved' LIMIT 1`,
      [application.profile_id],
    )).rowCount! > 0;
    const account = (await client.query(`SELECT role FROM users WHERE id=$1`, [application.user_id])).rows[0];
    if (approved && account?.role === 'customer') {
      await client.query(
        `UPDATE guruji_profiles SET status='approved',"isVerified"=true,"isAvailable"=true,
          aadhar_verified=true,documents_verified=true,"updatedAt"=NOW() WHERE id=$1`,
        [application.profile_id],
      );
    } else if (!approved && account?.role === 'customer') {
      const stillPending = (await client.query(
        `SELECT 1 FROM other_category_applications WHERE profile_id=$1 AND status='pending' LIMIT 1`,
        [application.profile_id],
      )).rowCount! > 0;
      if (!stillPending) await client.query(
        `UPDATE guruji_profiles SET "isAvailable"=false,"updatedAt"=NOW() WHERE id=$1`,
        [application.profile_id],
      );
    }
    const applicant = (await client.query(
      `SELECT user_id,category_id FROM other_category_applications WHERE id=$1`, [id],
    )).rows[0];
    const category = (await client.query(`SELECT name FROM other_registration_categories WHERE id=$1`, [applicant.category_id])).rows[0];
    const notificationMessage = parsed.data.status === 'approved'
      ? `Your ${category.name} provider application has been approved. You can now receive booking requests.`
      : `Your ${category.name} provider application was not approved. ${parsed.data.rejectionReason}`;
    await client.query(
      `INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
       VALUES($1,$2,$3,$4,false,NOW())`,
      [applicant.user_id, parsed.data.status === 'approved' ? 'Category application approved' : 'Category application update',
        notificationMessage, 'other_category_application'],
    );
    await client.query('COMMIT');
    return res.json({ message: parsed.data.status === 'approved' ? 'Application approved' : 'Application rejected' });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to review application' });
  } finally {
    client.release();
  }
});
