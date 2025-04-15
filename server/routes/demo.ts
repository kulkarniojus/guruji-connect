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
    
    // Get customer bookings that are pending
    const demoCustomer = await storage.getUserByEmail('demo.customer@example.com');
    if (!demoCustomer) {
      return res.status(404).json({ message: 'Demo customer not found' });
    }
    
    const customerBookings = await storage.getBookingsByCustomerId(demoCustomer.id);
    const pendingBookings = customerBookings.filter(b => b.status === 'pending' || b.status === 'pending_approval');
    
    // Create synthetic booking requests for the demo
    const requestsWithDetails = await Promise.all(
      pendingBookings.map(async (booking) => {
        // Get puja details
        let puja = null;
        if (booking.pujaId) {
          puja = await storage.getPuja(booking.pujaId);
        }
        
        // Synthetic request
        return {
          id: booking.id * 10 + gurujiProfile.id, // Generate a unique ID
          bookingId: booking.id,
          gurujiId: gurujiProfile.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
          booking,
          puja,
          customer: {
            id: demoCustomer.id,
            firstName: demoCustomer.firstName,
            lastName: demoCustomer.lastName,
            email: demoCustomer.email,
            mobile: demoCustomer.mobile,
          },
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
    
    // Extract the booking ID from the requestId
    // Note: in our simplified demo mode, requestId is booking.id * 10 + gurujiProfile.id
    // So we can extract the booking ID by dividing and using Math.floor
    const bookingId = Math.floor(parseInt(requestId) / 10);
    
    // Get the original booking
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Get customer
    const customer = await storage.getUser(booking.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    if (response === 'accept') {
      // Assign guruji to booking
      await storage.assignGurujiToBooking(booking.id, gurujiProfile.id);
      
      // Update booking status to confirmed
      await storage.updateBookingStatus(booking.id, 'confirmed');
      
      // Notify customer
      await storage.createNotification({
        userId: customer.id,
        title: 'Booking Confirmed',
        message: `Your booking has been accepted by ${guruji.firstName} ${guruji.lastName}`,
        type: 'booking_confirmed',
      });
      
      // Notify other gurujis with demo accounts that the booking was accepted
      const otherGurujis = await Promise.all([
        storage.getUserByEmail('demo.guruji1@example.com'),
        storage.getUserByEmail('demo.guruji2@example.com'),
        storage.getUserByEmail('demo.guruji3@example.com')
      ]);
      
      for (const otherGuruji of otherGurujis.filter(Boolean)) {
        if (otherGuruji && otherGuruji.id !== guruji.id) {
          await storage.createNotification({
            userId: otherGuruji.id,
            title: 'Booking Already Accepted',
            message: 'A booking request you received has been accepted by another guruji',
            type: 'booking_expired',
          });
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
      // Create a declined notification for customer
      await storage.createNotification({
        userId: customer.id,
        title: 'Booking Update',
        message: `Guruji ${guruji.firstName} ${guruji.lastName} has declined your booking request.`,
        type: 'booking_update',
      });
      
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