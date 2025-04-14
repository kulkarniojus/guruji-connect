import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import { storage } from '../storage';
import { requestStatusEnum, bookingStatusEnum } from '@shared/schema';

/**
 * Route to send booking requests to verified gurujis
 */
export async function sendBookingRequests(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "ID must be a number",
      }),
    }).parse(req.params);

    const booking = await storage.getBooking(parseInt(id));
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Check if booking is already assigned or in a non-pending state
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: `Booking is already in ${booking.status} state` });
    }

    // Find verified gurujis in the same city
    const nearbyGurujis = await storage.getNearbyGurujis(booking.city, booking.pujaId);
    
    // Filter only verified gurujis
    const verifiedGurujis = nearbyGurujis.filter(guruji => guruji.aadharVerified && guruji.documentsVerified);
    
    if (verifiedGurujis.length === 0) {
      return res.status(404).json({ message: "No verified gurujis found in this area" });
    }

    // Update booking status to pending_approval
    await storage.updateBookingStatus(booking.id, 'pending_approval');
    
    // Create booking requests for all verified gurujis
    const requests = [];
    for (const guruji of verifiedGurujis) {
      const requestData = {
        bookingId: booking.id,
        gurujiId: guruji.id,
        status: 'pending',
      };
      
      const request = await storage.createBookingRequest(requestData);
      requests.push(request);
      
      // Send notification to each guruji
      await storage.createNotification({
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
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: "Failed to send booking requests" });
  }
}

/**
 * Route to respond to a booking request (accept or decline)
 */
export async function respondToBookingRequest(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "ID must be a number",
      }),
    }).parse(req.params);

    const { response, message } = z.object({
      response: z.enum(['accept', 'decline']),
      message: z.string().optional(),
    }).parse(req.body);

    const requestId = parseInt(id);
    const bookingRequest = await storage.getBookingRequest(requestId);
    
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }
    
    // Check if request is already accepted or declined
    if (bookingRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${bookingRequest.status}` });
    }
    
    // Get the original booking
    const booking = await storage.getBooking(bookingRequest.bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Check if booking is still in pending_approval state
    if (booking.status !== 'pending_approval') {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }
    
    if (response === 'accept') {
      // Update request status to accepted
      await storage.updateBookingRequestStatus(requestId, 'accepted', message);
      
      // Assign guruji to booking
      await storage.assignGurujiToBooking(booking.id, bookingRequest.gurujiId);
      
      // Update booking status to confirmed
      await storage.updateBookingStatus(booking.id, 'confirmed');
      
      // Get customer information
      const customer = await storage.getUser(booking.customerId);
      
      // Get guruji information
      const guruji = await storage.getGurujiProfile(bookingRequest.gurujiId);
      const gurujiUser = guruji ? await storage.getUser(guruji.userId) : null;
      
      if (customer) {
        // Notify customer
        await storage.createNotification({
          userId: customer.id,
          title: 'Booking Confirmed',
          message: gurujiUser 
            ? `Your booking has been accepted by ${gurujiUser.firstName} ${gurujiUser.lastName}`
            : 'Your booking has been confirmed',
          type: 'booking_confirmed',
        });
      }
      
      // Update all other pending requests for this booking to expired
      await storage.expireOtherBookingRequests(booking.id, requestId);
      
      // Notify other gurujis
      const otherRequests = await storage.getBookingRequestsByBookingId(booking.id);
      for (const req of otherRequests) {
        if (req.id !== requestId && req.status === 'expired') {
          const otherGuruji = await storage.getGurujiProfile(req.gurujiId);
          if (otherGuruji) {
            await storage.createNotification({
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
      // Update request status to declined
      await storage.updateBookingRequestStatus(requestId, 'declined', message);
      
      // Check if all requests are declined
      const allRequests = await storage.getBookingRequestsByBookingId(booking.id);
      const allDeclined = allRequests.every(req => 
        req.status === 'declined' || req.status === 'expired' || req.status === 'cancelled'
      );
      
      if (allDeclined) {
        // If all requests are declined, update booking status back to pending
        await storage.updateBookingStatus(booking.id, 'pending');
        
        // Notify customer that no guruji is available
        const customer = await storage.getUser(booking.customerId);
        if (customer) {
          await storage.createNotification({
            userId: customer.id,
            title: 'Booking Update',
            message: 'We couldn\'t find an available guruji for your booking. Please try again later or choose a different date/time.',
            type: 'booking_update',
          });
        }
      }
      
      res.status(200).json({ message: "Booking request declined" });
    }
  } catch (error) {
    console.error("Error responding to booking request:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: "Failed to process booking request response" });
  }
}

/**
 * Route to cancel a confirmed booking by guruji
 */
export async function cancelBookingByGuruji(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "ID must be a number",
      }),
    }).parse(req.params);

    const { reason } = z.object({
      reason: z.string().min(10, "Please provide a detailed reason for cancellation"),
    }).parse(req.body);

    const booking = await storage.getBooking(parseInt(id));
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Verify this booking belongs to the current guruji
    const userId = req.session.userId as number;
    const guruji = await storage.getGurujiProfileByUserId(userId);
    
    if (!guruji || booking.gurujiId !== guruji.id) {
      return res.status(403).json({ message: "You are not authorized to cancel this booking" });
    }
    
    // Check booking status - only confirmed bookings can be cancelled
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: `Cannot cancel booking in ${booking.status} state` });
    }
    
    // Calculate penalty based on time until booking
    const bookingTime = new Date(booking.date);
    const currentTime = new Date();
    const timeUntilBooking = bookingTime.getTime() - currentTime.getTime();
    const hoursUntilBooking = timeUntilBooking / (1000 * 60 * 60);
    
    let penalty = 0;
    
    // Penalty based on how close to the booking time the cancellation is
    if (hoursUntilBooking < 2) {
      // Less than 2 hours: 20% penalty
      penalty = Math.round(booking.amount * 0.20);
    } else if (hoursUntilBooking < 24) {
      // Less than 24 hours: 10% penalty
      penalty = Math.round(booking.amount * 0.10);
    } else if (hoursUntilBooking < 48) {
      // Less than 48 hours: 5% penalty
      penalty = Math.round(booking.amount * 0.05);
    }
    
    // Update booking status to cancelled
    await storage.updateBookingStatus(booking.id, 'cancelled');
    
    // Find the booking request associated with this guruji
    const bookingRequests = await storage.getBookingRequestsByBookingId(booking.id);
    const gurujiRequest = bookingRequests.find(req => req.gurujiId === guruji.id);
    
    if (gurujiRequest) {
      // Update the booking request status to cancelled with reason
      const updatedRequest = await storage.updateBookingRequestStatus(
        gurujiRequest.id, 
        'cancelled', 
        reason
      );
      
      // Add penalty to the guruji
      if (updatedRequest) {
        updatedRequest.penalty = penalty;
        updatedRequest.cancellationReason = reason;
      }
    }
    
    // Notify the customer
    const customer = await storage.getUser(booking.customerId);
    if (customer) {
      await storage.createNotification({
        userId: customer.id,
        title: 'Booking Cancelled',
        message: `Your booking has been cancelled by the guruji. Reason: ${reason}`,
        type: 'booking_cancelled',
      });
    }
    
    // Look for other pending requests that can be reactivated
    const otherPendingRequests = bookingRequests.filter(req => 
      req.status === 'pending' && req.gurujiId !== guruji.id
    );
    
    if (otherPendingRequests.length > 0) {
      // Change booking status back to pending_approval
      await storage.updateBookingStatus(booking.id, 'pending_approval');
      
      // Notify other gurujis that they can now accept this booking
      for (const req of otherPendingRequests) {
        const otherGuruji = await storage.getGurujiProfile(req.gurujiId);
        if (otherGuruji) {
          await storage.createNotification({
            userId: otherGuruji.userId,
            title: 'Booking Available Again',
            message: 'A previously assigned booking is now available for you to accept',
            type: 'booking_available',
          });
        }
      }
    }
    
    res.status(200).json({ 
      message: "Booking cancelled successfully", 
      penalty: penalty
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(error),
      });
    }
    res.status(500).json({ message: "Failed to cancel booking" });
  }
}

/**
 * Route to get booking requests for a guruji
 */
export async function getGurujiBookingRequests(req: Request, res: Response) {
  try {
    const userId = req.session.userId as number;
    const guruji = await storage.getGurujiProfileByUserId(userId);
    
    if (!guruji) {
      return res.status(404).json({ message: "Guruji profile not found" });
    }
    
    const requests = await storage.getBookingRequestsByGurujiId(guruji.id);
    
    // Get booking details for each request
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const booking = await storage.getBooking(request.bookingId);
        let puja = null;
        let customer = null;
        
        if (booking) {
          if (booking.pujaId) {
            puja = await storage.getPuja(booking.pujaId);
          }
          
          customer = await storage.getUser(booking.customerId);
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