import { Router } from 'express';
import { z } from 'zod';
import { changeBookingCompletion, getBookingCompletion } from '../bookingCompletion';

export const bookingCompletionRouter = Router({ mergeParams: true });
const idSchema = z.coerce.number().int().positive();

bookingCompletionRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});
bookingCompletionRouter.get('/', async (req, res) => {
  try {
    const id = idSchema.parse((req.params as Record<string, string>).id);
    const result = await getBookingCompletion(id, { id: req.session.userId!, role: req.session.userRole! });
    res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Invalid booking ID' });
    console.error('Failed to read completion status', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Could not load puja completion status' });
  }
});
for (const action of ['request', 'verify', 'override'] as const) {
  bookingCompletionRouter.post(`/${action}`, async (req, res) => {
    try {
      const id = idSchema.parse((req.params as Record<string, string>).id);
      const payload = action === 'request'
        ? z.object({ resend: z.boolean().optional() }).parse(req.body)
        : action === 'verify'
          ? z.object({ otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit completion OTP') }).parse(req.body)
          : z.object({ reason: z.string().trim().min(10).max(1000) }).parse(req.body);
      const result = await changeBookingCompletion(id, { id: req.session.userId!, role: req.session.userRole! }, action, payload);
      res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors.map(issue => issue.message).join('; ') });
      console.error(`Failed completion action ${action}`, error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: 'Could not update puja completion' });
    }
  });
}