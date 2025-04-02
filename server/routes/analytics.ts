import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated, checkRole } from '../middlewares/auth';

export const analyticsRouter = Router();

// In demo mode, we're bypassing authentication for easy access to analytics dashboard
// In a production environment, we would use: analyticsRouter.use(isAuthenticated, checkRole(['admin']));

// Overview analytics
analyticsRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    // Get counts of users, bookings, pujas, and revenue
    const stats = {
      totalUsers: 0,
      totalBookings: 0,
      totalPujas: 0,
      totalRevenue: 0,
      activeGurujis: 0,
      pendingBookings: 0,
      completedBookings: 0
    };

    // In a production app, we would use SQL aggregations for better performance
    // This is a simplified implementation for the prototype

    // Example stats calculation (in a real app these would be optimized queries)
    const allUsers = await storage.getAllUsers();
    stats.totalUsers = allUsers.length;
    stats.activeGurujis = allUsers.filter(user => user.role === 'guruji').length;

    const allBookings = await storage.getAllBookings();
    stats.totalBookings = allBookings.length;
    stats.pendingBookings = allBookings.filter(booking => booking.status === 'pending').length;
    stats.completedBookings = allBookings.filter(booking => booking.status === 'completed').length;

    const allPujas = await storage.getAllPujas();
    stats.totalPujas = allPujas.length;

    // Calculate total revenue from completed bookings
    const payments = await storage.getAllPayments();
    stats.totalRevenue = payments
      .filter(payment => payment.status === 'paid')
      .reduce((total, payment) => total + payment.amount, 0);

    // Calculate recent growth
    const growth = {
      users: 5.2, // Percentage growth in the last month
      bookings: 12.8,
      revenue: 8.5
    };

    res.json({
      stats,
      growth
    });
  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
});

// User analytics
analyticsRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsers();
    
    // User distribution by role
    const usersByRole = {
      customers: allUsers.filter(user => user.role === 'customer').length,
      gurujis: allUsers.filter(user => user.role === 'guruji').length,
      admins: allUsers.filter(user => user.role === 'admin').length
    };

    // User analytics by gender
    const usersByGender = {
      male: allUsers.filter(user => user.gender === 'male').length,
      female: allUsers.filter(user => user.gender === 'female').length,
      other: allUsers.filter(user => user.gender === 'other').length
    };

    // New users trend (monthly)
    const newUserTrend = [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 19 },
      { month: 'Mar', count: 23 },
      { month: 'Apr', count: 17 },
      { month: 'May', count: 28 },
      { month: 'Jun', count: 34 }
    ];

    // Active users data
    const activeUsers = {
      daily: 45,
      weekly: 128,
      monthly: 267
    };

    // Retention rate
    const retentionRate = {
      value: 73.2,
      change: 5.6 // Percentage change compared to last period
    };

    res.json({
      totalUsers: allUsers.length,
      activeUsers,
      usersByRole,
      usersByGender,
      newUserTrend,
      retentionRate
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Failed to fetch user analytics' });
  }
});

// Booking analytics
analyticsRouter.get('/bookings', async (req: Request, res: Response) => {
  try {
    const allBookings = await storage.getAllBookings();
    
    // Bookings by status
    const bookingsByStatus = [
      { status: 'pending', count: allBookings.filter(b => b.status === 'pending').length },
      { status: 'confirmed', count: allBookings.filter(b => b.status === 'confirmed').length },
      { status: 'in_progress', count: allBookings.filter(b => b.status === 'in_progress').length },
      { status: 'completed', count: allBookings.filter(b => b.status === 'completed').length },
      { status: 'cancelled', count: allBookings.filter(b => b.status === 'cancelled').length }
    ];

    // Bookings by type
    const bookingsByType = {
      online: allBookings.filter(b => b.type === 'online').length,
      offline: allBookings.filter(b => b.type === 'offline').length
    };

    // Bookings trend (monthly)
    const bookingTrend = [
      { month: 'Jan', count: 28 },
      { month: 'Feb', count: 35 },
      { month: 'Mar', count: 42 },
      { month: 'Apr', count: 38 },
      { month: 'May', count: 55 },
      { month: 'Jun', count: 67 }
    ];

    // Average booking duration
    const averageDuration = allBookings.reduce((total, booking) => total + booking.duration, 0) / allBookings.length || 0;

    // Popular pujas
    const pujaBookingCounts: { [key: number]: number } = {};
    allBookings.forEach(booking => {
      if (booking.pujaId) {
        pujaBookingCounts[booking.pujaId] = (pujaBookingCounts[booking.pujaId] || 0) + 1;
      }
    });

    const allPujas = await storage.getAllPujas();
    const popularPujas = Object.entries(pujaBookingCounts)
      .map(([pujaId, count]) => {
        const puja = allPujas.find(p => p.id === parseInt(pujaId));
        return {
          id: parseInt(pujaId),
          name: puja ? puja.name : 'Unknown Puja',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalBookings: allBookings.length,
      bookingsByStatus,
      bookingsByType,
      bookingTrend,
      averageDuration,
      popularPujas
    });
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    res.status(500).json({ message: 'Failed to fetch booking analytics' });
  }
});

// Revenue analytics
analyticsRouter.get('/revenue', async (req: Request, res: Response) => {
  try {
    const allPayments = await storage.getAllPayments();
    
    // Total revenue
    const totalRevenue = allPayments
      .filter(payment => payment.status === 'paid')
      .reduce((total, payment) => total + payment.amount, 0);

    // Revenue by month
    const revenueTrend = [
      { month: 'Jan', amount: 18500 },
      { month: 'Feb', amount: 22400 },
      { month: 'Mar', amount: 28900 },
      { month: 'Apr', amount: 25700 },
      { month: 'May', amount: 32600 },
      { month: 'Jun', amount: 38200 }
    ];

    // Revenue by puja type
    const allBookings = await storage.getAllBookings();
    const allPujas = await storage.getAllPujas();
    
    // Map of pujaId to puja type
    const pujaTypeMap: { [key: number]: string } = {};
    allPujas.forEach(puja => {
      pujaTypeMap[puja.id] = puja.type;
    });
    
    // Calculate revenue by puja type
    const revenueByPujaType = {
      online: 0,
      offline: 0
    };
    
    for (const payment of allPayments) {
      if (payment.status === 'paid') {
        const booking = allBookings.find(b => b.id === payment.bookingId);
        if (booking && booking.pujaId) {
          const pujaType = pujaTypeMap[booking.pujaId] || booking.type;
          revenueByPujaType[pujaType] += payment.amount;
        }
      }
    }

    // Calculate average transaction value
    const avgTransactionValue = totalRevenue / allPayments.filter(p => p.status === 'paid').length || 0;

    // Payment method distribution
    const paymentMethodCounts: { [key: string]: number } = {};
    allPayments.forEach(payment => {
      if (payment.paymentMethod) {
        paymentMethodCounts[payment.paymentMethod] = (paymentMethodCounts[payment.paymentMethod] || 0) + 1;
      }
    });
    
    const paymentMethods = Object.entries(paymentMethodCounts).map(([method, count]) => ({
      method,
      count
    }));

    res.json({
      totalRevenue,
      revenueTrend,
      revenueByPujaType,
      avgTransactionValue,
      paymentMethods
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Failed to fetch revenue analytics' });
  }
});

// Chatbot analytics
analyticsRouter.get('/chatbot', async (req: Request, res: Response) => {
  try {
    // In a real implementation, these would be fetched from the database
    // For the prototype, we'll use simulated data
    
    // Total conversations
    const totalConversations = 235;
    
    // User engagement metrics
    const engagement = {
      totalUsers: 189,
      activeUsers: 124,
      averageMessagesPerUser: 8.3
    };
    
    // Message metrics
    const messageMetrics = {
      totalMessages: 1947,
      averageResponseTime: 2.4, // seconds
      automatedResponses: 1683,
      humanHandoffs: 264
    };
    
    // Intent recognition metrics
    const intentMetrics = {
      successRate: 87.2, // percentage
      topIntents: [
        { intent: 'booking_inquiry', count: 532 },
        { intent: 'puja_information', count: 423 },
        { intent: 'payment_issue', count: 246 },
        { intent: 'guruji_availability', count: 198 },
        { intent: 'cancel_booking', count: 156 }
      ],
      unrecognizedQueries: 248
    };
    
    // Conversation analytics
    const conversationAnalytics = {
      averageDuration: 4.8, // minutes
      completionRate: 82.3, // percentage
      abandonmentRate: 17.7, // percentage
      satisfactionScore: 4.2 // out of 5
    };
    
    // Weekly trend
    const weeklyTrend = [
      { week: 'Week 1', conversations: 42, messages: 347 },
      { week: 'Week 2', conversations: 56, messages: 468 },
      { week: 'Week 3', conversations: 67, messages: 583 },
      { week: 'Week 4', conversations: 70, messages: 549 }
    ];

    res.json({
      totalConversations,
      engagement,
      messageMetrics,
      intentMetrics,
      conversationAnalytics,
      weeklyTrend
    });
  } catch (error) {
    console.error('Error fetching chatbot analytics:', error);
    res.status(500).json({ message: 'Failed to fetch chatbot analytics' });
  }
});

// Video session analytics
analyticsRouter.get('/video', async (req: Request, res: Response) => {
  try {
    // In a real implementation, these would be fetched from the database
    // For the prototype, we'll use simulated data
    
    // Total video sessions
    const totalSessions = 122;
    
    // Sessions by status
    const byStatus = [
      { status: 'completed', count: 89 },
      { status: 'dropped', count: 22 },
      { status: 'technical_issue', count: 11 }
    ];
    
    // Average session duration in minutes
    const averageDuration = 28.4;
    
    // Technical metrics
    const technicalMetrics = {
      averageLatency: 245, // milliseconds
      packetLoss: 1.2, // percentage
      connectionIssues: 18 // count
    };
    
    // Usage trends by day of week
    const trends = [
      { day: 'Monday', count: 14 },
      { day: 'Tuesday', count: 18 },
      { day: 'Wednesday', count: 21 },
      { day: 'Thursday', count: 17 },
      { day: 'Friday', count: 23 },
      { day: 'Saturday', count: 16 },
      { day: 'Sunday', count: 13 }
    ];
    
    // Quality ratings
    const qualityRatings = {
      excellent: 42,
      good: 36,
      average: 25,
      poor: 8
    };
    
    // Device statistics
    const deviceStats = {
      desktop: 68,
      mobile: 46,
      tablet: 8
    };

    res.json({
      totalSessions,
      byStatus,
      averageDuration,
      technicalMetrics,
      trends,
      qualityRatings,
      deviceStats
    });
  } catch (error) {
    console.error('Error fetching video analytics:', error);
    res.status(500).json({ message: 'Failed to fetch video analytics' });
  }
});