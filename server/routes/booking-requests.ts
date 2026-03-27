import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import { DBStorage } from '../dbStorage';

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
      booking.pujaId, 
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
      await db.updateBookingRequestStatus(requestId, 'accepted', message);
      await db.assignGurujiToBooking(booking.id, bookingRequest.gurujiId);
      await db.updateBookingStatus(booking.id, 'confirmed');
      
      const customer = await db.getUser(booking.customerId);
      const guruji = await db.getGurujiProfile(bookingRequest.gurujiId);
      const gurujiUser = guruji ? await db.getUser(guruji.userId) : null;
      
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
      
      await db.expireOtherBookingRequests(booking.id, requestId);
      
      const otherRequests = await db.getBookingRequestsByBookingId(booking.id);
      for (const req of otherRequests) {
        if (req.id !== requestId && req.status === 'expired') {
          const otherGuruji = await db.getGurujiProfile(req.gurujiId);
          if (otherGuruji) {
            await db.createNotification({
              userId: otherGuruji.userId,
              title: 'Booking Already Accepted',
              message: 'A booking request you received has been accepted by another guruji',
              type: 'booking_expired',
            });
          }
        }
      }
      
      res.status(200).json({ message: "Booking request accepted" });
    } else {
      await db.updateBookingRequestStatus(requestId, 'declined', message);
      
      const allRequests = await db.getBookingRequestsByBookingId(booking.id);
      const allDeclined = allRequests.every(r => 
        r.status === 'declined' || r.status === 'expired' || r.status === 'cancelled'
      );
      
      if (allDeclined) {
        await db.updateBookingStatus(booking.id, 'pending');
        
        const customer = await db.getUser(booking.customerId);
        if (customer) {
          await db.createNotification({
            userId: customer.id,
            title: 'Booking Update',
            message: 'We couldn\'t find an available guruji for your booking. Please try again later.',
            type: 'booking_update',
          });
        }
      }
      
      res.status(200).json({ message: "Booking request declined" });
    }
  } catch (error) {
    console.error("Error responding to booking request:", error);
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
