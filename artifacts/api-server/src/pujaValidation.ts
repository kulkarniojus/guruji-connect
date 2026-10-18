import { z } from 'zod';

const imageUrl = z.string().trim().max(2048).nullable().optional().refine(value => {
  if (!value || /^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Photo URL must be an HTTP/HTTPS image URL or a site image path beginning with /');

export const createPujaPayload = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1),
  basePrice: z.number().int().min(0),
  price: z.number().int().min(0).nullable().optional(),
  type: z.enum(['online', 'offline']),
  duration: z.number().int().min(0).max(1440),
  items: z.array(z.string()).nullable().optional(),
  imageUrl,
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

export const updatePujaPayload = createPujaPayload.partial();