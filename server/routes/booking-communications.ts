import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { adminBookingParticipants, communicationChannels, communicationHistory, sendBookingCommunication } from '../bookingCommunications';

export const bookingCommunicationsRouter = Router({ mergeParams: true });
bookingCommunicationsRouter.use(async (req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  try {
    if (!req.session.userId || req.session.userRole !== 'admin' ||
        (await pool.query('SELECT role FROM users WHERE id=$1', [req.session.userId])).rows[0]?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' }); return;
    }
    next();
  } catch { res.status(500).json({ message: 'Could not verify admin authorization' }); }
});
const idOf = (params: unknown) => z.object({ id: z.coerce.number().int().positive() }).parse(params).id;
bookingCommunicationsRouter.get('/', async (req, res) => {
  try {
    const id = idOf(req.params);
    const booking = await adminBookingParticipants(id);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
    const participant = (role: string) => booking[`${role}_user_id`] ? {
      id: booking[`${role}_user_id`], name: [booking[`${role}_first`], booking[`${role}_last`]].filter(Boolean).join(' '),
      email: booking[`${role}_email`], mobile: booking[`${role}_mobile`],
    } : null;
    res.json({ participants: { customer: participant('customer'), guruji: participant('guruji') }, channels: communicationChannels, history: await communicationHistory(id) });
  } catch (error) {
    res.status(error instanceof z.ZodError ? 400 : 500).json({ message: 'Could not load booking communications' });
  }
});
bookingCommunicationsRouter.post('/', async (req, res) => {
  try {
    const input = z.object({
      recipient: z.enum(['customer', 'guruji', 'both']), kind: z.enum(['address', 'otp', 'notification', 'message']),
      channel: z.enum(['in_app', 'whatsapp', 'email']),
      title: z.string().trim().max(120).optional(), text: z.string().trim().max(2000).optional(),
    }).superRefine((value, ctx) => {
      if (['message', 'notification'].includes(value.kind) && !value.text) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a message to send.' });
    }).parse(req.body);
    const result = await sendBookingCommunication(idOf(req.params), req.session.userId!, input);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(error instanceof z.ZodError ? 400 : 500).json({
      message: error instanceof z.ZodError ? error.errors.map(issue => issue.message).join('; ') : 'Could not send booking communication. Nothing was reported as sent.',
    });
  }
});