import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';

export const addressesRouter = Router();
const sessionToken = z.string().uuid();
const searches = new Map<string, { count: number; until: number }>();
addressesRouter.get('/config', (_req, res) => {
  res.json({ enabled: Boolean(process.env.GOOGLE_MAPS_API_KEY) });
});
addressesRouter.use((req, res, next) => {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(503).json({
      message: 'Google address search is not configured yet. Please enter your address manually.',
      code: 'ADDRESS_SEARCH_NOT_CONFIGURED',
    });
  }
  const now = Date.now();
  if (searches.size > 10000) {
    searches.forEach((value, key) => { if (value.until <= now) searches.delete(key); });
    if (searches.size > 10000) return res.status(429).json({ message: 'Address search is busy. Please try again shortly.' });
  }
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = searches.get(key);
  if (!entry || entry.until <= now) {
    entry = { count: 0, until: now + 60000 };
    searches.set(key, entry);
  }
  if (++entry.count > 40) {
    res.setHeader('Retry-After', Math.ceil((entry.until - now) / 1000));
    return res.status(429).json({ message: 'Too many address searches. Please wait a minute or enter your address manually.' });
  }
  next();
});

async function googleRequest(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(8000),
    headers: { ...options.headers, 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY! },
  });
  if (!response.ok) throw new Error('Google address search is unavailable');
  return response.json();
}
function failure(error: unknown, res: any) {
  if (error instanceof z.ZodError) return res.status(400).json({ message: 'Invalid address search request' });
  // Do not log customer addresses, API keys or upstream response bodies.
  return res.status(502).json({
    message: 'Google address search is temporarily unavailable. Please enter your address manually.',
    code: 'ADDRESS_SEARCH_UNAVAILABLE',
  });
}
addressesRouter.post('/search', async (req, res) => {
  try {
    const data = z.object({
      input: z.string().trim().min(3).max(200),
      city: z.string().trim().min(1).max(100),
      sessionToken,
    }).parse(req.body);
    const cities = (await pool.query('SELECT name FROM cities WHERE "isActive"=TRUE')).rows;
    const normalized = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
    const city = cities.find(row => normalized(row.name) === normalized(data.city));
    if (!city) return res.status(400).json({ message: 'Select an active service city before searching for an address' });
    const result = await googleRequest('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: `${data.input}, ${city.name}`,
        includedRegionCodes: ['in'],
        languageCode: 'en',
        sessionToken: data.sessionToken,
      }),
    });
    res.json({ suggestions: (result.suggestions || [])
      .filter((item: any) => item.placePrediction?.placeId)
      .map((item: any) => ({
        placeId: item.placePrediction.placeId,
        description: item.placePrediction.text?.text || '',
      })) });
  } catch (error) { failure(error, res); }
});
addressesRouter.post('/details', async (req, res) => {
  try {
    const data = z.object({
      placeId: z.string().min(1).max(300).regex(/^[A-Za-z0-9_-]+$/),
      sessionToken,
    }).parse(req.body);
    const params = new URLSearchParams({ sessionToken: data.sessionToken, languageCode: 'en' });
    const result = await googleRequest(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(data.placeId)}?${params}`,
      { headers: { 'X-Goog-FieldMask': 'id,formattedAddress,addressComponents' } },
    );
    const country = result.addressComponents?.find((part: any) => part.types?.includes('country'));
    if (country?.shortText !== 'IN' || !result.formattedAddress) {
      return res.status(400).json({ message: 'Please select an address in India' });
    }
    const postal = result.addressComponents?.find((part: any) => part.types?.includes('postal_code'))?.longText;
    res.json({ address: result.formattedAddress, pincode: /^[1-9]\d{5}$/.test(postal || '') ? postal : '' });
  } catch (error) { failure(error, res); }
});
