import { Router, Request, Response } from 'express';
import { createBookingRequestDemoData, getOrCreateDemoBookingRequests } from '../demo/booking-requests-demo';
import { storage } from '../storage';

const router = Router();

/**
 * Demo endpoint to initialize the booking notification demo data
 */
router.post('/initialize-booking-demo', async (req: Request, res: Response) => {
  try {
    const { customer, booking } = await createBookingRequestDemoData();
    
    res.status(200).json({
      message: 'Demo data initialized successfully',
      demoCredentials: [
        {
          role: 'customer',
          email: 'demo.customer@example.com',
          password: 'demo123',
        },
        {
          role: 'guruji1',
          email: 'demo.guruji1@example.com',
          password: 'demo123',
        },
        {
          role: 'guruji2',
          email: 'demo.guruji2@example.com',
          password: 'demo123',
        },
        {
          role: 'guruji3',
          email: 'demo.guruji3@example.com',
          password: 'demo123',
        },
      ],
      customer,
      booking,
    });
  } catch (error) {
    console.error('Error initializing demo:', error);
    res.status(500).json({ message: 'Failed to initialize demo data' });
  }
});

/**
 * Demo endpoint to send booking requests to gurujis
 */
router.post('/send-booking-requests', async (req: Request, res: Response) => {
  try {
    // Get the demo booking
    const demoCustomer = await storage.getUserByEmail('demo.customer@example.com');
    if (!demoCustomer) {
      return res.status(404).json({ 
        message: 'Demo data not found. Please initialize demo data first.',
        initializationRequired: true
      });
    }
    
    const customerBookings = await storage.getBookingsByCustomerId(demoCustomer.id);
    const demoBooking = customerBookings.find(b => b.status === 'pending' || b.status === 'pending_approval');
    
    if (!demoBooking) {
      return res.status(404).json({ 
        message: 'Demo booking not found. Please initialize demo data first.',
        initializationRequired: true
      });
    }
    
    // Update booking status to pending_approval
    await storage.updateBookingStatus(demoBooking.id, 'pending_approval');
    
    // Create booking requests
    const requests = await getOrCreateDemoBookingRequests(demoBooking.id);
    
    res.status(200).json({
      message: `Demo booking requests sent to ${requests.length} gurujis`,
      requests,
      booking: {
        ...demoBooking,
        status: 'pending_approval'
      }
    });
  } catch (error) {
    console.error('Error sending demo booking requests:', error);
    res.status(500).json({ message: 'Failed to send demo booking requests' });
  }
});

/**
 * Demo endpoint to get all demo booking requests for a specific guruji
 */
router.get('/guruji-booking-requests/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const guruji = await storage.getUserByEmail(email);
    
    if (!guruji) {
      return res.status(404).json({ message: 'Guruji not found' });
    }
    
    const gurujiProfile = await storage.getGurujiProfileByUserId(guruji.id);
    if (!gurujiProfile) {
      return res.status(404).json({ message: 'Guruji profile not found' });
    }
    
    const requests = await storage.getBookingRequestsByGurujiId(gurujiProfile.id);
    
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
    console.error('Error fetching demo guruji booking requests:', error);
    res.status(500).json({ message: 'Failed to fetch demo booking requests' });
  }
});

/**
 * Demo endpoint to get all notifications for a user
 */
router.get('/notifications/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const notifications = await storage.getNotifications(user.id);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching demo notifications:', error);
    res.status(500).json({ message: 'Failed to fetch demo notifications' });
  }
});

/**
 * Demo endpoint to respond to a booking request (accept or decline)
 */
router.post('/respond-to-request/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { response, email, message } = req.body;
    
    if (!requestId || !response || !email) {
      return res.status(400).json({ 
        message: 'Missing required parameters. Required: requestId, response, email' 
      });
    }
    
    if (response !== 'accept' && response !== 'decline') {
      return res.status(400).json({ 
        message: 'Invalid response. Must be either "accept" or "decline"' 
      });
    }
    
    const guruji = await storage.getUserByEmail(email);
    if (!guruji) {
      return res.status(404).json({ message: 'Guruji not found' });
    }
    
    const gurujiProfile = await storage.getGurujiProfileByUserId(guruji.id);
    if (!gurujiProfile) {
      return res.status(404).json({ message: 'Guruji profile not found' });
    }
    
    const bookingRequest = await storage.getBookingRequest(parseInt(requestId));
    if (!bookingRequest) {
      return res.status(404).json({ message: 'Booking request not found' });
    }
    
    if (bookingRequest.gurujiId !== gurujiProfile.id) {
      return res.status(403).json({ 
        message: 'You are not authorized to respond to this booking request' 
      });
    }
    
    // Check if request is already accepted or declined
    if (bookingRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Request is already ${bookingRequest.status}` 
      });
    }
    
    // Get the original booking
    const booking = await storage.getBooking(bookingRequest.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if booking is still in pending_approval state
    if (booking.status !== 'pending_approval') {
      return res.status(400).json({ 
        message: `Booking is already ${booking.status}` 
      });
    }
    
    if (response === 'accept') {
      // Update request status to accepted
      await storage.updateBookingRequestStatus(bookingRequest.id, 'accepted', message);
      
      // Assign guruji to booking
      await storage.assignGurujiToBooking(booking.id, bookingRequest.gurujiId);
      
      // Update booking status to confirmed
      await storage.updateBookingStatus(booking.id, 'confirmed');
      
      // Get customer information
      const customer = await storage.getUser(booking.customerId);
      
      if (customer) {
        // Notify customer
        await storage.createNotification({
          userId: customer.id,
          title: 'Booking Confirmed',
          message: `Your booking has been accepted by ${guruji.firstName} ${guruji.lastName}`,
          type: 'booking_confirmed',
          isRead: false,
        });
      }
      
      // Update all other pending requests for this booking to expired
      await storage.expireOtherBookingRequests(booking.id, bookingRequest.id);
      
      // Notify other gurujis
      const otherRequests = await storage.getBookingRequestsByBookingId(booking.id);
      for (const req of otherRequests) {
        if (req.id !== bookingRequest.id && req.status === 'expired') {
          const otherGuruji = await storage.getGurujiProfile(req.gurujiId);
          if (otherGuruji) {
            await storage.createNotification({
              userId: otherGuruji.userId,
              title: 'Booking Already Accepted',
              message: 'A booking request you received has been accepted by another guruji',
              type: 'booking_expired',
              isRead: false,
            });
          }
        }
      }
      
      res.status(200).json({ 
        message: "Booking request accepted successfully",
        status: 'accepted',
        booking: {
          ...booking,
          status: 'confirmed',
          gurujiId: gurujiProfile.id
        }
      });
    } else {
      // Update request status to declined
      await storage.updateBookingRequestStatus(bookingRequest.id, 'declined', message);
      
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
            isRead: false,
          });
        }
      }
      
      res.status(200).json({ 
        message: "Booking request declined successfully",
        status: 'declined',
        booking: booking
      });
    }
  } catch (error) {
    console.error('Error responding to demo booking request:', error);
    res.status(500).json({ message: 'Failed to process demo booking request response' });
  }
});

/**
 * Demo endpoint to reset the demo booking to initial state
 */
router.post('/reset-demo-booking', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Missing required parameter: email' });
    }
    
    const customer = await storage.getUserByEmail(email);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Get customer's bookings
    const bookings = await storage.getBookingsByCustomerId(customer.id);
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this customer' });
    }
    
    const demoBooking = bookings[0]; // Take the first booking
    
    // Reset booking to pending state
    await storage.updateBookingStatus(demoBooking.id, 'pending');
    
    // Get all booking requests for this booking
    const requests = await storage.getBookingRequestsByBookingId(demoBooking.id);
    
    // Delete all booking requests
    for (const request of requests) {
      // Since we don't have a delete method, we'll just update the status to cancelled
      await storage.updateBookingRequestStatus(request.id, 'cancelled', 'Demo reset');
    }
    
    res.status(200).json({
      message: 'Demo booking reset successfully',
      booking: {
        ...demoBooking,
        status: 'pending',
        gurujiId: null
      }
    });
  } catch (error) {
    console.error('Error resetting demo booking:', error);
    res.status(500).json({ message: 'Failed to reset demo booking' });
  }
});

export default router;