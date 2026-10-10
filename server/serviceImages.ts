/** Optimized, bundled service imagery; admin-uploaded/custom URLs remain untouched. */
export const defaultServiceImages: Record<string, string> = {
  'online-puja': '/images/services/online-puja.webp',
  'online-consultation': '/images/services/online-consultation.webp',
  'brahmin-booking': '/images/services/brahmin-booking.webp',
  'special-occasions': '/images/services/special-occasions.webp',
  'traditional-puja': '/images/services/traditional-puja.webp',
  training: '/images/services/training.webp',
  gifts: '/images/services/gifts.webp',
};

const originalImages: Record<string, string> = {
  'online-puja': '/images/onlinepuja.png',
  'online-consultation': '/images/onlineconsultation.png',
  'brahmin-booking': '/images/brahmanbooking.png',
  'special-occasions': '/images/specialoccasion_puja.png',
  'traditional-puja': '/images/traditional_puja.png',
  training: '/images/onlinepuja.png',
  gifts: '/images/onlinepuja.png',
};

/** Only replace the original illustrations, never reset images an admin has customized. */
export async function upgradeDefaultServiceImages(client: {
  query: (sql: string, values: unknown[]) => Promise<unknown>;
}) {
  for (const slug of Object.keys(defaultServiceImages)) {
    await client.query(`UPDATE our_services SET image=$1,"updatedAt"=NOW()
      WHERE slug=$2 AND image=$3`, [defaultServiceImages[slug], slug, originalImages[slug]]);
  }
}
