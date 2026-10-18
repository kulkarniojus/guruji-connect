import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { defaultServiceImages, upgradeDefaultServiceImages } from './serviceImages';

const appPath = z.string().trim().max(500).refine(
  value => /^\/(?:booking|pujas|services)(?:[/?#]|$)/.test(value) && !value.includes('\\'),
  'Use a local booking, pujas or services link',
);
const imagePath = z.string().trim().max(2000).refine(
  value => /^\/(?!\/)/.test(value) && !value.includes('\\') || /^https:\/\//i.test(value),
  'Use a local image path or an HTTPS image URL',
);
export const servicePayload = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(10000),
  image: imagePath,
  bookingHref: appPath.default('/booking?type=puja'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

// Seed once, including the services previously present on the catalogue page.
// Emptying the catalogue deliberately must not recreate deleted entries.
const seeds = [
  ['online-puja', 'Online Puja Booking', 'Book pujas online from the comfort of your home and participate virtually in real-time. Experience authentic rituals performed by verified pandits, with detailed explanation and guidance throughout the ceremony.', '/images/onlinepuja.png', '/booking?type=online'],
  ['online-consultation', 'Online Consultation', 'Get expert guidance from verified pandits via video call for astrological or spiritual advice. Receive personalized solutions for various life challenges based on ancient scriptures and astrological calculations.', '/images/onlineconsultation.png', '/booking?type=consultation'],
  ['brahmin-booking', 'Brahmin Booking', 'Book experienced Brahmins for various religious ceremonies at your home or preferred location. Our verified Brahmins are well-versed in traditional rituals and can perform ceremonies according to your family customs.', '/images/brahmanbooking.png', '/booking?type=puja'],
  ['special-occasions', 'Special Occasions', 'Book for special occasions like Varsha shradha, Kumarika, Vat Savitri puja, Mangalagaur, and more. We provide comprehensive services including all necessary materials and detailed guidance for these important life events.', '/images/specialoccasion_puja.png', '/booking?type=puja'],
  ['traditional-puja', 'Traditional Puja Ceremony', 'Experience authentic traditional pujas performed with precise rituals and mantras. Our services include Griha Pravesh, Naamkaran, Mundan, Upanayana, and many more life ceremonies.', '/images/traditional_puja.png', '/booking?type=puja'],
  ['training', 'Spiritual Training Programs', 'Learn traditional rituals, Sanskrit mantras, and spiritual practices through our structured training programs. Our courses are designed for individuals of all backgrounds interested in learning authentic practices.', '/images/onlinepuja.png', '/services'],
  ['gifts', 'Religious Gifts & Products', 'Shop for authentic religious items, puja samagri, idols, books, and other spiritual products. All items are carefully sourced and blessed, ensuring authenticity and positive energy.', '/images/onlinepuja.png', '/services'],
];

export async function initializeOurServices() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(18364012)');
    const existing = await client.query("SELECT to_regclass('public.our_services') AS table_name");
    await client.query(`CREATE TABLE IF NOT EXISTS our_services (
      id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT NOT NULL, image TEXT NOT NULL,
      "bookingHref" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    if (!existing.rows[0].table_name) {
      for (let index = 0; index < seeds.length; index++) {
        await client.query(`INSERT INTO our_services
          (slug,title,description,image,"bookingHref","sortOrder") VALUES ($1,$2,$3,$4,$5,$6)`,
        [...seeds[index].slice(0, 3), defaultServiceImages[seeds[index][0]], seeds[index][4], index]);
      }
    }
    await upgradeDefaultServiceImages(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const fields = 'id,slug,title,description,image,"bookingHref","isActive","sortOrder"';
function serviceError(error: any, res: any) {
  if (error instanceof z.ZodError) return res.status(400).json({ message: error.issues[0].message });
  if (error.code === '23505') return res.status(409).json({ message: 'A service with this slug already exists' });
  console.error('Service operation failed');
  return res.status(500).json({ message: 'Could not save or load services. Please try again.' });
}
export const servicesRouter = Router();
servicesRouter.get('/', async (_req, res) => {
  try {
    res.json((await pool.query(`SELECT ${fields} FROM our_services WHERE "isActive" = TRUE ORDER BY "sortOrder",id`)).rows);
  } catch (error) { serviceError(error, res); }
});
servicesRouter.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${fields} FROM our_services WHERE slug=$1 AND "isActive"=TRUE`, [req.params.slug]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Service is unavailable' });
    res.json(result.rows[0]);
  } catch (error) { serviceError(error, res); }
});

// Authentication and admin authorization are applied at the mount point.
export const adminServicesRouter = Router();
adminServicesRouter.get('/', async (_req, res) => {
  try {
    res.json((await pool.query(`SELECT ${fields} FROM our_services ORDER BY "sortOrder",id`)).rows);
  } catch (error) { serviceError(error, res); }
});
adminServicesRouter.post('/', async (req, res) => {
  try {
    const data = servicePayload.parse(req.body);
    const result = await pool.query(`INSERT INTO our_services
      (slug,title,description,image,"bookingHref","isActive","sortOrder")
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${fields}`, Object.values(data));
    res.status(201).json(result.rows[0]);
  } catch (error) { serviceError(error, res); }
});
adminServicesRouter.put('/:id', async (req, res) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const current = await pool.query('SELECT * FROM our_services WHERE id=$1', [id]);
    if (!current.rows[0]) return res.status(404).json({ message: 'Service not found' });
    const data = servicePayload.parse({ ...current.rows[0], ...req.body });
    const result = await pool.query(`UPDATE our_services SET slug=$1,title=$2,description=$3,image=$4,
      "bookingHref"=$5,"isActive"=$6,"sortOrder"=$7,"updatedAt"=NOW() WHERE id=$8 RETURNING ${fields}`,
    [...Object.values(data), id]);
    res.json(result.rows[0]);
  } catch (error) { serviceError(error, res); }
});
adminServicesRouter.delete('/:id', async (req, res) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await pool.query('DELETE FROM our_services WHERE id=$1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (error) { serviceError(error, res); }
});
