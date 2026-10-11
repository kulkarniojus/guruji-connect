import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import { DBStorage } from '../dbStorage';
import { pool } from '../db';
import { getBusyGurujiIds, parseBookingTime } from '../bookingSchedule';
import { declineBookingRequest } from '../bookingDeclines';

const db = new DBStorage();

export async function sendBookingRequests(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "ID must be a number",
      }),
    }).parse(req.params);

    const booking = await db.getBooking(parseInt(id));
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: `Booking is already in ${booking.status} state` });
    }

    const nearbyGurujis = await db.getNearbyGurujis(
      booking.city || '', 
      booking.pujaId ?? undefined,
      20,
      (booking as any).pincode
    );
    
    const verifiedGurujis = nearbyGurujis.filter(g => g.aadharVerified && g.documentsVerified);
    
    if (verifiedGurujis.length === 0) {
      return res.status(404).json({ message: "No verified gurujis found in this area" });
    }

    await db.updateBookingStatus(booking.id, 'pending_approval');
    
    const requests = [];
    for (const guruji of verifiedGurujis) {
      const request = await db.createBookingRequest({
        bookingId: booking.id,
        gurujiId: guruji.id,
        status: 'pending',
      });
      requests.push(request);
      
      await db.createNotification({
        userId: guruji.userId,
        title: 'New Booking Request',
        message: `You have a new booking request for ${booking.type === 'offline' ? 'in-person' : 'online'} puja in ${booking.city}`,
        type: 'booking_request',
      });
    }
    
    res.status(200).json({ 
      message: `Booking requests sent to ${requests.length} gurujis`,
      requestsCount: requests.length
    });
  } catch (error) {
    console.error("Error sending booking requests:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: fromZodError(error) });
    }
    res.status(500).json({ message: "Failed to send booking requests" });
  }
}

export async function respondToBookingRequest(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), { message: "ID must be a number" }),
    }).parse(req.params);

    const { response, message } = z.object({
      response: z.enum(['accept', 'decline']),
      message: z.string().optional(),
    }).parse(req.body);

    const requestId = parseInt(id);
    const bookingRequest = await db.getBookingRequest(requestId);
    
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    const guruji = await db.getGurujiProfileByUserId(req.session.userId as number);
    if (!guruji || guruji.id !== bookingRequest.gurujiId) {
      return res.status(403).json({ message: "This request belongs to another Guruji" });
    }
    
    if (bookingRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${bookingRequest.status}` });
    }
    
    const booking = await db.getBooking(bookingRequest.bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    if (booking.status !== 'pending_approval') {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }
    
    if (response === 'accept') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(8158, $1)', [booking.id]);
        await client.query('SELECT pg_advisory_xact_lock(8157, $1)', [bookingRequest.gurujiId]);
        const latestBooking = await db.getBooking(booking.id);
        const latestRequest = await db.getBookingRequest(requestId);
        if (latestBooking?.status !== 'pending_approval' || latestRequest?.status !== 'pending') {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This booking request is no longer open' });
        }
        const puja = booking.pujaId ? await db.getPuja(booking.pujaId) : undefined;
        const date = new Date(booking.date).toISOString().slice(0, 10);
        const scheduledTime = (booking as any).time as string | undefined;
        if (!puja || !scheduledTime || parseBookingTime(scheduledTime) === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Booking schedule is incomplete' });
        }
        const busy = await getBusyGurujiIds(
          [bookingRequest.gurujiId], date, scheduledTime, booking.duration ?? puja.duration,
        );
        if (busy.has(bookingRequest.gurujiId)) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'You are already booked at this time' });
        }
        await db.updateBookingRequestStatus(requestId, 'accepted', message);
        await db.assignGurujiToBooking(booking.id, bookingRequest.gurujiId);
        await db.updateBookingStatus(booking.id, 'confirmed');
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
      const customer = await db.getUser(booking.customerId);
      const guruji = await db.getGurujiProfile(bookingRequest.gurujiId);
      const gurujiUser = guruji ? await db.getUser(guruji.userId) : null;
      
      // Notify customer — include guruji name since it's their own booking
      if (customer) {
        await db.createNotification({
          userId: customer.id,
          title: 'Booking Confirmed',
          message: gurujiUser 
            ? `Your booking has been accepted by ${gurujiUser.firstName} ${gurujiUser.lastName}`
            : 'Your booking has been confirmed',
          type: 'booking_confirmed',
        });
      }
      
      // Notify the accepting guruji — confirmation for themselves only, no other names
      if (guruji) {
        await db.createNotification({
          userId: guruji.userId,
          title: 'Booking Accepted',
          message: `You have accepted booking #${booking.id} for ${booking.type === 'offline' ? 'in-person' : 'online'} puja in ${booking.city || 'your area'}. Please be ready on the scheduled date.`,
          type: 'booking_confirmed',
        });
      }
      
      await db.expireOtherBookingRequests(booking.id, requestId);
      
      // Notify other gurujis — do NOT mention who accepted it
      const otherRequests = await db.getBookingRequestsByBookingId(booking.id);
      for (const req of otherRequests) {
        if (req.id !== requestId && req.status === 'expired') {
          const otherGuruji = await db.getGurujiProfile(req.gurujiId);
          if (otherGuruji) {
            await db.createNotification({
              userId: otherGuruji.userId,
              title: 'Booking Request Closed',
              message: `The booking request you received for puja in ${booking.city || 'your area'} has been confirmed by another guruji. No action required on your part.`,
              type: 'booking_expired',
            });
          }
        }
      }
      
      res.status(200).json({ message: "Booking request accepted" });
    } else {
      const allDeclined = await declineBookingRequest(booking.id,requestId,guruji.id,message);
      
      if (allDeclined) {
        const customer = await db.getUser(booking.customerId);
        if (customer) {
          await db.createNotification({
            userId: customer.id,
            title: 'Booking Update',
            message: 'The requested Gurujis could not accept your puja. Your booking remains open and the Sanatan Guruji support team has been alerted to help arrange another Guruji.',
            type: 'booking_update',
          });
        }
      }
      
      res.status(200).json({ message: "Booking request declined" });
    }
  } catch (error) {
    console.error("Error responding to booking request:", error);
    if ((error as any)?.status === 409) return res.status(409).json({message:(error as Error).message});
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: fromZodError(error) });
    }
    res.status(500).json({ message: "Failed to process booking request response" });
  }
}

export async function cancelBookingByGuruji(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), { message: "ID must be a number" }),
    }).parse(req.params);

    const { reason } = z.object({
      reason: z.string().min(10, "Please provide a detailed reason for cancellation"),
    }).parse(req.body);

    const booking = await db.getBooking(parseInt(id));
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    const userId = req.session.userId as number;
    const guruji = await db.getGurujiProfileByUserId(userId);
    
    if (!guruji || booking.gurujiId !== guruji.id) {
      return res.status(403).json({ message: "You are not authorized to cancel this booking" });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: `Cannot cancel booking in ${booking.status} state` });
    }
    
    await db.updateBookingStatus(booking.id, 'cancelled');
    
    const customer = await db.getUser(booking.customerId);
    if (customer) {
      await db.createNotification({
        userId: customer.id,
        title: 'Booking Cancelled',
        message: `Your booking has been cancelled by the guruji. Reason: ${reason}`,
        type: 'booking_cancelled',
      });
    }
    
    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: fromZodError(error) });
    }
    res.status(500).json({ message: "Failed to cancel booking" });
  }
}

export async function getGurujiBookingRequests(req: Request, res: Response) {
  try {
    const userId = req.session.userId as number;
    const guruji = await db.getGurujiProfileByUserId(userId);
    
    if (!guruji) {
      return res.status(404).json({ message: "Guruji profile not found" });
    }
    
    const requests = await db.getBookingRequestsByGurujiId(guruji.id);
    
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const booking = await db.getBooking(request.bookingId);
        let puja = null;
        let customer = null;
        
        if (booking) {
          if (booking.pujaId) {
            puja = await db.getPuja(booking.pujaId);
          }
          customer = await db.getUser(booking.customerId);
        }
        
        return {
          ...request,
          booking,
          puja,
          customer: customer ? {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            mobile: customer.mobile,
          } : null,
        };
      })
    );
    
    res.json(requestsWithDetails);
  } catch (error) {
    console.error("Error fetching guruji booking requests:", error);
    res.status(500).json({ message: "Failed to fetch booking requests" });
  }
}
