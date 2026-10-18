import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validBookingDate } from './bookingSchedule';
import { pool } from './db';

export const staffRegistrationPayload = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Enter a ten-digit mobile number'),
  password: z.string().min(6, 'Password must have at least six characters'),
  age: z.coerce.number().int().min(18).max(120),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().regex(/^$|^\d{6}$/, 'Pincode must have six digits').optional(),
  dob: z.string().refine(value => !value || (validBookingDate(value) &&
    value <= new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date())), 'Enter a valid date of birth').optional(),
  aadhar: z.string().trim().regex(/^$|^\d{12}$/, 'Aadhaar must have twelve digits').optional(),
  caste: z.string().trim().optional(),
  photoUrl: z.string().optional(),
  experience: z.coerce.number().int().min(0).max(100).optional(),
  pricePerHour: z.coerce.number().int().min(0).optional(),
  cities: z.array(z.union([z.string(), z.number()])).optional(),
  pujas: z.array(z.union([z.string(), z.number()])).optional(),
  languages: z.array(z.string().trim().min(1)).optional(),
  isOnline: z.boolean().optional(),
  isOffline: z.boolean().optional(),
  isConsultation: z.boolean().optional(),
  certificates: z.array(z.string()).optional(),
}).passthrough();

export async function validateStaffRegistration(req: Request, res: Response, next: NextFunction) {
  const parsed = staffRegistrationPayload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0].message, errors: parsed.error.issues});
  req.body = parsed.data;
  if (req.path.endsWith('register-guruji')) {
    const cityChoices = parsed.data.cities || [];
    const pujaChoices = parsed.data.pujas || [];
    if (!cityChoices.length || !pujaChoices.length || !parsed.data.languages?.length) {
      return res.status(400).json({message: 'Select service cities, pujas and languages'});
    }
    try {
      const cities = await pool.query(`SELECT id,name FROM cities WHERE "isActive"=true`);
      const resolved = cityChoices.map(choice => cities.rows.find(c =>
        String(c.id) === String(choice) || c.name.toLowerCase() === String(choice).trim().toLowerCase()));
      if (resolved.some(c => !c)) return res.status(400).json({message: 'Choose active service cities'});
      req.body.cities = resolved.map(c => c.name);
      const primary = cities.rows.find(c => String(c.id) === String(req.body.location) ||
        c.name.toLowerCase() === String(req.body.location || '').toLowerCase());
      req.body.location = primary?.name || req.body.cities[0];
      const ids = pujaChoices.map(Number);
      if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) return res.status(400).json({message: 'Choose valid pujas'});
      const pujas = await pool.query(`SELECT id FROM pujas WHERE id=ANY($1::int[]) AND "isActive"=true`, [ids]);
      if (new Set(ids).size !== pujas.rowCount) return res.status(400).json({message: 'Choose active pujas'});
    } catch {
      return res.status(503).json({message: 'Unable to verify registration choices'});
    }
  }
  next();
}
