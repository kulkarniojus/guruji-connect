import { pool } from '../server/db';

// Run intentionally, not on application startup: never reset later admin edits.
if (process.env.NODE_ENV === 'production') throw new Error('Run this catalogue setup against the development database only.');

const additions = [
  ['Rudrabhishek', 'Traditional abhishek and worship of Lord Shiva with Vedic chanting. Discuss offerings and preparation with your Guruji.', 3500, 120, 'shiva', true],
  ['Mahamrityunjaya Puja', 'Worship and chanting of the Mahamrityunjaya mantra dedicated to Lord Shiva. The chanting count and arrangements can be discussed with your Guruji.', 4500, 180, 'shiva', false],
  ['Durga Puja', 'Devotional worship of Goddess Durga with traditional offerings, prayers, and aarti for family and community occasions.', 3500, 120, 'durga', true],
  ['Saraswati Puja', 'Worship of Goddess Saraswati, traditionally associated with learning, music, and the arts. Suitable for students, families, and educational occasions.', 2000, 90, 'havan', false],
  ['Hanuman Puja', 'Worship of Lord Hanuman with devotional recitation, offerings, and aarti. Discuss your preferred prayers with the Guruji.', 2000, 90, 'havan', false],
  ['Navgraha Shanti Puja', 'Traditional worship of the nine grahas with Vedic prayers and offerings. The ritual arrangements depend on your requirements.', 4500, 180, 'havan', false],
  ['Vastu Shanti Puja', 'A traditional ceremony for a home or workspace with prayers and havan. Confirm the location and preparation with your Guruji.', 5000, 180, 'havan', false],
  ['Bhoomi Puja', 'A ceremony traditionally performed before starting construction, with worship of the land and prayers for the new undertaking.', 3500, 120, 'havan', false],
  ['Vivah Puja', 'Traditional Hindu wedding rituals including the sacred fire ceremony. Discuss your family customs, ceremony schedule, and requirements with the Guruji.', 7500, 240, 'havan', false],
  ['Namkaran Ceremony', 'A traditional naming ceremony welcoming a child into the family, with prayers and blessings according to family customs.', 2500, 90, 'havan', false],
  ['Annaprashan Ceremony', 'A traditional first-food ceremony for a child. Discuss the ceremony arrangements and family customs with your Guruji.', 2500, 90, 'havan', false],
  ['Mundan Ceremony', 'Traditional prayers accompanying a child’s first hair-cutting ceremony, according to family and regional customs.', 2500, 90, 'havan', false],
  ['Pitru Tarpan', 'Traditional offerings and prayers in remembrance of ancestors. Discuss the date, location, and family requirements with the Guruji.', 2500, 90, 'havan', false],
  ['Shraddha Puja', 'Rituals and prayers in remembrance of departed family members, performed according to family customs and the agreed arrangements.', 3500, 120, 'havan', false],
  ['Sundarkand Path', 'Devotional recitation of the Sundarkand with prayers and aarti. Suitable for family gatherings and spiritual occasions.', 3500, 150, 'havan', false],
  ['Chandi Havan', 'Traditional Devi worship with Chandi recitation and havan. Discuss the scale, chanting, materials, and schedule with your Guruji.', 7500, 240, 'durga', false],
  ['Diwali Lakshmi Ganesh Puja', 'Festive worship of Goddess Lakshmi and Lord Ganesha, traditionally performed during Diwali for homes and businesses.', 3000, 90, 'lakshmi', false],
  ['Kuber Puja', 'Traditional worship of Lord Kuber with prayers and offerings. Confirm the service arrangements and ritual details with your Guruji.', 2500, 90, 'lakshmi', false],
  ['Gayatri Havan', 'A Vedic fire ceremony with Gayatri mantra chanting, prayers, and offerings. Discuss the preparation and participants with your Guruji.', 3500, 120, 'havan', false],
  ['Tulsi Vivah', 'The traditional ceremonial celebration of Tulsi Vivah with devotional prayers and offerings, following family customs.', 3000, 120, 'altar', false],
] as const;

const legacyPhotos: Record<string, string> = {
  'Satyanarayan Puja': 'altar',
  'Griha Pravesh': 'havan',
  'Ganesh Puja': 'ganesh',
  'Mahalakshmi Puja': 'lakshmi',
  'Navratri puja': 'durga',
};
const originalPaths = [
  '/images/satyanarayan_puja.jpg', '/images/grihapraveshpuja.png',
  '/images/ganesh.jpg', '/images/navratri.png', '/images/navratri_puja.png',
];

const client = await pool.connect();
try {
  await client.query('BEGIN');
  let created = 0;
  for (const [name, description, basePrice, duration, photo, isPopular] of additions) {
    const result = await client.query(
      `INSERT INTO pujas (name,description,"basePrice",price,type,duration,items,"imageUrl","isPopular","isActive","createdAt","updatedAt")
       SELECT $1,$2,$3,$3,'offline',$4,ARRAY[]::text[],$5,$6,true,NOW(),NOW()
       WHERE NOT EXISTS (SELECT 1 FROM pujas WHERE lower(trim(name))=lower($1))`,
      [name, description, basePrice, duration, `/images/pujas/${photo}.jpg`, isPopular],
    );
    created += result.rowCount || 0;
  }
  let photosUpdated = 0;
  for (const [name, photo] of Object.entries(legacyPhotos)) {
    const result = await client.query(
      `UPDATE pujas SET "imageUrl"=$1,"updatedAt"=NOW()
       WHERE name=$2 AND ("imageUrl" IS NULL OR "imageUrl"='' OR "imageUrl"=ANY($3::text[]))`,
      [`/images/pujas/${photo}.jpg`, name, originalPaths],
    );
    photosUpdated += result.rowCount || 0;
  }
  await client.query('COMMIT');
  console.log(`Created ${created} pujas and updated ${photosUpdated} starter photos. Existing rates, IDs, visibility, popularity, and custom photo URLs preserved.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}