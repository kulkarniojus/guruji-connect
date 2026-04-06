import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage, IStorage, MemStorage } from "./storage";
import { DBStorage } from "./dbStorage";
import { pool } from './db';

// Use database storage in production, memory storage for quick testing
const storageInstance = process.env.DATABASE_URL ? new DBStorage() : storage;
import { z } from "zod";
import { ZodError } from "zod";
import { genSalt, hash, compare } from "bcrypt";
import { generateOTP, isValidOTP } from "./services/otp";
import { sendSMS, sendEmail } from "./services/notification";
import session from "express-session";
import MemoryStore from "memorystore";
import { fromZodError } from "zod-validation-error";
import { registerPaymentRoutes } from "./routes/payment";
import chatbotRoutes from "./routes/chatbot";
import { analyticsRouter } from "./routes/analytics";
import journeyRoutes from "./routes/journey";
import pujaRoutes from "./routes/pujas";
import demoRoutes from "./routes/demo";
import { 
  sendBookingRequests, 
  respondToBookingRequest, 
  cancelBookingByGuruji, 
  getGurujiBookingRequests 
} from "./routes/booking-requests";

// Extend session type to include userId and userRole
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

const SessionStore = MemoryStore(session);

// Initialize admin user if it doesn't exist (ONLY in development)
// Ensure app_settings table exists and has a seed row
async function initializeAppSettings() {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        payment_required BOOLEAN NOT NULL DEFAULT FALSE,
        upi_id TEXT,
        upi_name TEXT,
        upi_qr_image_url TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO app_settings (payment_required)
      SELECT FALSE WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1)
    `);
  } catch (err) {
    console.error("Warning: could not initialize app_settings:", err);
  }
}

async function initializeAdminUser() {
  // Only create admin user in development environment
  if (process.env.NODE_ENV === 'production') {
    console.log("🔒 Admin auto-creation disabled in production for security");
    return;
  }

  try {
    // Create development admin user only if environment variable is set
    if (process.env.CREATE_DEV_ADMIN === 'true') {
      const devAdmin = await storageInstance.getUserByEmail("dev-admin@local.dev");
      if (!devAdmin) {
        await storageInstance.createUser({
          firstName: "Dev",
          lastName: "Admin",
          email: "dev-admin@local.dev", 
          mobile: "0000000000",
          password: "dev-admin-2024",
          age: 30,
          gender: "male",
          role: "admin",
          isVerified: true,
          isBlocked: false
        });
        console.log("✓ Development admin user created for testing purposes only");
      }
    }
  } catch (error) {
    console.error("Error creating dev admin user:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize admin user and app settings
  await initializeAdminUser();
  await initializeAppSettings();

  // Set up session middleware
  app.use(
    session({
      store: new SessionStore({
        checkPeriod: 86400000, // Clear expired sessions every 24h
      }),
      secret: process.env.SESSION_SECRET || "pujaconnect-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(err).message,
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  });



  // Authentication middleware
  const isAuthenticated = (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    if (req.session && req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Role check middleware
  const checkRole = (roles: string[]) => (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.session.userRole || !roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };

  const isAdmin = checkRole(['admin']);

  // Authentication Routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }).parse(req.body);

      // Look up user in database
      const user = await storageInstance.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Redirect admin to admin login
      if (user.role === 'admin') {
        return res.status(401).json({ message: "Please use admin login" });
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return res.status(403).json({ message: "Your account has been blocked" });
      }

      // Verify password via database
      const isPasswordValid = await storageInstance.verifyPassword(user.id, password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Admin Login Route
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      console.log('Admin login attempt:', { email });
      
      // Find admin user
      const user = await storageInstance.getUserByEmail(email);
      console.log('User found:', user ? { id: user.id, email: user.email, role: user.role } : 'null');
      
      if (!user || user.role !== 'admin') {
        console.log('User not found or not admin');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password
      const isValidPassword = await storageInstance.verifyPassword(user.id, password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName || user.name || 'Admin',
          lastName: user.lastName || '',
          email: user.email,
          role: user.role,
          isVerified: true,
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Database initialization route
  app.post('/api/db/init', async (req: Request, res: Response) => {
    try {
      // Create cities table directly
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          state VARCHAR(255) NOT NULL,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert default cities
      const defaultCities = [
        { name: 'Mumbai', state: 'Maharashtra' },
        { name: 'Delhi', state: 'Delhi' },
        { name: 'Bangalore', state: 'Karnataka' },
        { name: 'Chennai', state: 'Tamil Nadu' },
        { name: 'Kolkata', state: 'West Bengal' },
        { name: 'Hyderabad', state: 'Telangana' },
        { name: 'Pune', state: 'Maharashtra' },
        { name: 'Ahmedabad', state: 'Gujarat' },
        { name: 'Jaipur', state: 'Rajasthan' },
        { name: 'Lucknow', state: 'Uttar Pradesh' },
        { name: 'Nagpur', state: 'Maharashtra' },
        { name: 'Nashik', state: 'Maharashtra' },
        { name: 'Kanpur', state: 'Uttar Pradesh' },
        { name: 'Indore', state: 'Madhya Pradesh' },
        { name: 'Surat', state: 'Gujarat' }
      ];

      // Clear existing cities and insert new ones
      await pool.query('DELETE FROM cities');
      
      for (const city of defaultCities) {
        await pool.query(
          `INSERT INTO cities (name, state, "isActive", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5)`,
          [city.name, city.state, true, new Date(), new Date()]
        );
      }
      
      res.json({ message: 'Database initialized successfully', cities: defaultCities.length });
    } catch (error) {
      console.error('Error initializing database:', error);
      res.status(500).json({ message: 'Failed to initialize database', error: error.message });
    }
  });

  // Cities Management Routes
  app.get('/api/cities', async (req: Request, res: Response) => {
    try {
      const cities = await storageInstance.getAllCities();
      res.json(cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });

  app.post('/api/cities', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { name, state } = req.body;
      const city = await storageInstance.createCity({ name, state, isActive: true });
      res.status(201).json(city);
    } catch (error) {
      console.error('Error creating city:', error);
      res.status(500).json({ message: 'Failed to create city' });
    }
  });

  app.put('/api/cities/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const city = await storageInstance.updateCity(id, updates);
      
      if (!city) {
        return res.status(404).json({ message: 'City not found' });
      }
      
      res.json(city);
    } catch (error) {
      console.error('Error updating city:', error);
      res.status(500).json({ message: 'Failed to update city' });
    }
  });

  app.delete('/api/cities/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storageInstance.deleteCity(id);
      
      if (!success) {
        return res.status(404).json({ message: 'City not found' });
      }
      
      res.json({ message: 'City deleted successfully' });
    } catch (error) {
      console.error('Error deleting city:', error);
      res.status(500).json({ message: 'Failed to delete city' });
    }
  });

  // Gurujis Listing Route (for booking page)
  app.get('/api/gurujis', async (req: Request, res: Response) => {
    try {
      const { city, pujaId, specialization } = req.query;
      
      console.log('Guruji filter params:', { city, pujaId, specialization });
      
      // Get all gurujis filtered by city and puja specialization
      // In development, show both pending and approved to enable testing
      const gurujis = await storageInstance.getGurujisByFilters({
        city: city as string,
        pujaId: pujaId ? parseInt(pujaId as string) : undefined,
        specialization: specialization as string,
        // Show all gurujis regardless of status for testing/demo purposes
      });
      
      console.log('Gurujis found:', gurujis.length);
      
      res.json(gurujis);
    } catch (error) {
      console.error('Error fetching gurujis:', error);
      res.status(500).json({ message: 'Failed to fetch gurujis' });
    }
  });

  // Guruji Registration Routes
  app.post('/api/guruji/register', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionUserId = req.session.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const sessionUser = await storageInstance.getUser(sessionUserId);
      if (!sessionUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        bio, experience, location, pricePerHour, cities, pujas, languages,
        isOnline, isOffline, isConsultation, aadharNumber, profilePicture, certificates,
        firstName, lastName, age, religion, pincode, city, state, address, videoUrl,
        // Extra fields required when a sales rep registers a guruji
        email, mobile,
      } = req.body;

      // Phone number is mandatory for all guruji registrations
      if (!mobile || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
      }

      let targetUserId = sessionUserId;

      if (sessionUser.role === 'sales' || sessionUser.role === 'sales_rep') {
        // Sales rep is registering a new guruji on their behalf
        if (!email) {
          return res.status(400).json({ message: 'Email is required when a sales rep registers a Guruji' });
        }

        // Look up by email first
        let gurujiUser = await storageInstance.getUserByEmail(email);

        if (!gurujiUser) {
          // Create a new user account for the guruji - password is the 10-digit mobile number
          gurujiUser = await storageInstance.createUser({
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            mobile,
            password: mobile, // use mobile as initial password
            role: 'guruji',
          } as any);
        } else if (gurujiUser.role === 'customer') {
          // Upgrade existing customer to guruji role
          await storageInstance.updateUser(gurujiUser.id, { role: 'guruji' } as any);
        }

        targetUserId = gurujiUser.id;
      }

      // Check if target user already has a guruji profile
      const existingProfile = await storageInstance.getGurujiProfileByUserId(targetUserId);
      if (existingProfile) {
        return res.status(400).json({ message: 'This person already has a Guruji application on file' });
      }

      // Create guruji profile with pending status
      const profilePayload: any = {
        userId: targetUserId,
        bio,
        experience,
        specialization: Array.isArray(pujas) ? pujas.join(',') : pujas,
        location: address || location,
        pricePerHour,
        languages: Array.isArray(languages) ? languages : [],
        isOnline: isOnline || false,
        isOffline: isOffline !== undefined ? isOffline : true,
        isConsultation: isConsultation || false,
        isAvailable: false,
        // Auto-verify new gurujis to enable them to receive bookings
        aadharVerified: true,
        documentsVerified: true,
        status: 'pending',
        rating: 0,
        totalReviews: 0,
        profilePictureUrl: profilePicture || null,
        certificates: certificates || [],
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        address: address || location || null,
        religion: religion || null,
        age: age || null,
        videoUrl: videoUrl || null,
      };

      const gurujiProfile = await storageInstance.createGurujiProfile(profilePayload);

      // Notify all admins about the new application
      try {
        const applicantName = `${firstName || ''} ${lastName || ''}`.trim() || email || 'A new applicant';
        const registeredBy = sessionUser.role === 'sales' ? ` (registered by sales rep ${sessionUser.firstName} ${sessionUser.lastName})` : '';
        const admins = await storageInstance.getUsersByRole('admin');
        await Promise.all(admins.map(admin =>
          storageInstance.createNotification({
            userId: admin.id,
            title: 'New Guruji Application',
            message: `${applicantName} has submitted a Guruji registration application${registeredBy}. Please review and approve.`,
            type: 'guruji_application',
            isRead: false,
          } as any)
        ));
      } catch (notifErr) {
        console.error('Failed to create admin notification:', notifErr);
      }

      res.status(201).json({
        message: 'Guruji application submitted successfully',
        profile: gurujiProfile
      });
    } catch (error) {
      console.error('Error creating guruji profile:', error);
      res.status(500).json({ message: 'Failed to submit application' });
    }
  });

  // Admin routes for guruji approval
  app.get('/api/admin/gurujis', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const gurujis = await storageInstance.getAllGurujiProfiles(status);
      res.json(gurujis);
    } catch (error) {
      console.error('Error fetching guruji profiles:', error);
      res.status(500).json({ message: 'Failed to fetch guruji profiles' });
    }
  });

  app.put('/api/admin/gurujis/:id/approve', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const gurujiId = parseInt(req.params.id);
      const adminId = req.session.userId!;
      
      const updatedProfile = await storageInstance.approveGuruji(gurujiId, adminId);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: 'Guruji profile not found' });
      }

      // Notify the guruji that their application was approved
      try {
        await storageInstance.createNotification({
          userId: updatedProfile.userId,
          title: 'Application Approved! 🎉',
          message: 'Congratulations! Your Guruji registration has been approved. You are now a verified Guruji on GurujiConnect.',
          type: 'guruji_approved',
          isRead: false,
        } as any);
      } catch (notifErr) {
        console.error('Failed to create approval notification:', notifErr);
      }
      
      res.json({
        message: 'Guruji approved successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Error approving guruji:', error);
      res.status(500).json({ message: 'Failed to approve guruji' });
    }
  });

  app.put('/api/admin/gurujis/:id/reject', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const gurujiId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }
      
      const updatedProfile = await storageInstance.rejectGuruji(gurujiId, reason);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: 'Guruji profile not found' });
      }

      // Notify the guruji that their application was rejected
      try {
        await storageInstance.createNotification({
          userId: updatedProfile.userId,
          title: 'Application Requires Attention',
          message: `Your Guruji application was not approved at this time. Reason: ${reason}. Please contact support for more information.`,
          type: 'guruji_rejected',
          isRead: false,
        } as any);
      } catch (notifErr) {
        console.error('Failed to create rejection notification:', notifErr);
      }
      
      res.json({
        message: 'Guruji application rejected',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Error rejecting guruji:', error);
      res.status(500).json({ message: 'Failed to reject guruji' });
    }
  });

  // Admin: Get all bookings with full enriched details
  app.get('/api/admin/bookings', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const bookings = await storageInstance.getAllBookings();
      const enriched = await Promise.all(bookings.map(async (b: any) => {
        const customer = b.customerId ? await storageInstance.getUser(b.customerId) : null;
        let gurujiUser = null;
        let gurujiProfile = null;
        if (b.gurujiId) {
          gurujiProfile = await storageInstance.getGurujiProfile(b.gurujiId);
          if (gurujiProfile) {
            gurujiUser = await storageInstance.getUser(gurujiProfile.userId);
          }
        }
        const puja = b.pujaId ? await storageInstance.getPuja(b.pujaId) : null;
        const requests = await storageInstance.getBookingRequestsByBookingId(b.id);
        return {
          ...b,
          customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() || customer.email : 'Unknown',
          gurujiName: gurujiUser ? `${gurujiUser.firstName} ${gurujiUser.lastName}`.trim() || gurujiUser.email : null,
          pujaName: puja?.name || 'Unknown Puja',
          requestCount: requests.length,
          pendingRequestCount: requests.filter((r: any) => r.status === 'pending').length,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // Admin: Assign a specific guruji to a booking
  app.post('/api/admin/bookings/:id/assign', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { gurujiId } = req.body;
      if (!gurujiId) return res.status(400).json({ message: 'gurujiId is required' });

      const booking = await storageInstance.assignGurujiToBooking(bookingId, gurujiId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      await storageInstance.updateBookingStatus(bookingId, 'confirmed');

      const guruji = await storageInstance.getGurujiProfile(gurujiId);
      if (guruji) {
        await storageInstance.createNotification({
          userId: guruji.userId,
          title: '📋 Booking Assigned by Admin',
          message: `A booking has been assigned to you directly by admin.`,
          type: 'booking_confirmed',
          isRead: false,
        } as any);
      }

      res.json({ message: 'Guruji assigned successfully', booking });
    } catch (error) {
      console.error('Error assigning guruji:', error);
      res.status(500).json({ message: 'Failed to assign guruji' });
    }
  });

  // Admin: Send/resend booking requests to all verified gurujis
  app.post('/api/admin/bookings/:id/send-requests', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storageInstance.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      const allGurujis = await storageInstance.getAllGurujiProfiles();
      const verifiedGurujis = allGurujis.filter((g: any) => g.aadharVerified && g.documentsVerified);

      if (verifiedGurujis.length === 0) {
        return res.status(400).json({ message: 'No verified gurujis available to send requests to' });
      }

      await storageInstance.updateBookingStatus(bookingId, 'pending_approval' as any);

      let requestCount = 0;
      for (const guruji of verifiedGurujis) {
        const existing = await storageInstance.getBookingRequestsByBookingId(bookingId);
        const alreadyHasRequest = existing.some((r: any) => r.gurujiId === guruji.id);
        if (!alreadyHasRequest) {
          await storageInstance.createBookingRequest({
            bookingId,
            gurujiId: guruji.id,
            status: 'pending',
          });
          await storageInstance.createNotification({
            userId: guruji.userId,
            title: '🔔 New Puja Request Available',
            message: `A new booking request is available in ${(booking as any).city || 'your area'}. Please check your dashboard.`,
            type: 'booking_request',
            isRead: false,
          } as any);
          requestCount++;
        }
      }

      res.json({ message: `Requests sent to ${requestCount} guruji(s)`, requestCount });
    } catch (error) {
      console.error('Error sending requests:', error);
      res.status(500).json({ message: 'Failed to send booking requests' });
    }
  });

  // Admin: Get all verified gurujis (for assign dialog)
  app.get('/api/admin/gurujis/verified', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const allGurujis = await storageInstance.getAllGurujiProfiles();
      const verified = await Promise.all(
        allGurujis
          .filter((g: any) => g.aadharVerified && g.documentsVerified)
          .map(async (g: any) => {
            const user = await storageInstance.getUser(g.userId);
            return {
              ...g,
              name: user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Unknown',
              email: user?.email,
            };
          })
      );
      res.json(verified);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch verified gurujis' });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        email,
        mobile,
        age,
        gender,
        password,
        role,
        aadhar,
        caste,
      } = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        mobile: z.string().length(10, "Mobile number must be 10 digits"),
        age: z.number().min(18, "You must be at least 18 years old"),
        gender: z.enum(["male", "female", "other"]),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["customer", "guruji"]),
        aadhar: z.string().optional(),
        caste: z.string().optional(),
      }).parse(req.body);

      // Check if user already exists in database
      const existingUser = await storageInstance.getUserByMobile(mobile);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this mobile number" });
      }

      const existingEmail = await storageInstance.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "User already exists with this email" });
      }

      // Create user in database (DBStorage hashes the password internally)
      const user = await storageInstance.createUser({
        firstName,
        lastName,
        email,
        mobile,
        age,
        gender,
        password,
        role,
        aadhar,
        caste,
      } as any);

      // If user is guruji, create a default profile
      if (role === "guruji") {
        await storageInstance.createGurujiProfile({
          userId: user.id,
          bio: "",
          experience: 0,
          specialization: "",
          location: "",
          city: "",
          radius: 10,
          isOnline: false,
          isOffline: true,
          isConsultation: false,
        } as any);
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error registering user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      const user = await storageInstance.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/auth/check-user", async (req: Request, res: Response) => {
    try {
      const { email } = z.object({
        email: z.string().email("Invalid email address"),
      }).parse(req.query);

      const user = await storageInstance.getUserByEmail(email as string);
      
      if (user) {
        const { password, ...userWithoutPassword } = user as any;
        return res.json({ exists: true, user: userWithoutPassword });
      }
      
      res.json({ exists: false });
    } catch (error) {
      console.error("Error checking user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to check user" });
    }
  });

  // Puja Routes
  app.get("/api/pujas", async (req: Request, res: Response) => {
    try {
      const pujas = await storageInstance.getAllPujas();
      res.json(pujas);
    } catch (error) {
      console.error("Error fetching pujas:", error);
      res.status(500).json({ message: "Failed to fetch pujas" });
    }
  });
  
  // Create a new puja
  app.post("/api/pujas", async (req: Request, res: Response) => {
    // TODO: Re-enable authentication in production
    // For development, we're allowing pujas to be created without auth
    // isAuthenticated, checkRole(["admin"]), 
    try {
      const pujaData = req.body;
      console.log("Creating new puja:", pujaData);
      const newPuja = await storageInstance.createPuja(pujaData);
      console.log("Created puja:", newPuja);
      res.status(201).json(newPuja);
    } catch (error) {
      console.error("Error creating puja:", error);
      res.status(500).json({ message: "Failed to create puja" });
    }
  });
  
  // Update an existing puja
  app.put("/api/pujas/:id", async (req: Request, res: Response) => {
    // TODO: Re-enable authentication in production
    // For development, we're allowing pujas to be updated without auth
    // isAuthenticated, checkRole(["admin"]), 
    try {
      const id = parseInt(req.params.id);
      const pujaData = req.body;
      console.log("Updating puja:", id, pujaData);
      const updatedPuja = await storageInstance.updatePuja(id, pujaData);
      if (!updatedPuja) {
        return res.status(404).json({ message: "Puja not found" });
      }
      console.log("Updated puja:", updatedPuja);
      res.json(updatedPuja);
    } catch (error) {
      console.error("Error updating puja:", error);
      res.status(500).json({ message: "Failed to update puja" });
    }
  });
  
  // Delete a puja
  app.delete("/api/pujas/:id", async (req: Request, res: Response) => {
    // TODO: Re-enable authentication in production
    // For development, we're allowing pujas to be deleted without auth
    // isAuthenticated, checkRole(["admin"]), 
    try {
      const id = parseInt(req.params.id);
      console.log("Deleting puja:", id);
      const success = await storageInstance.deletePuja(id);
      if (!success) {
        return res.status(404).json({ message: "Puja not found" });
      }
      console.log("Deleted puja:", id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting puja:", error);
      res.status(500).json({ message: "Failed to delete puja" });
    }
  });

  app.get("/api/pujas/search", async (req: Request, res: Response) => {
    try {
      const { query } = z.object({
        query: z.string().min(1),
      }).parse(req.query);

      const pujas = await storageInstance.searchPujas(query as string);
      res.json(pujas);
    } catch (error) {
      console.error("Error searching pujas:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to search pujas" });
    }
  });

  app.get("/api/pujas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const puja = await storageInstance.getPuja(parseInt(id));
      
      if (!puja) {
        return res.status(404).json({ message: "Puja not found" });
      }
      
      res.json(puja);
    } catch (error) {
      console.error("Error fetching puja:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to fetch puja" });
    }
  });

  // Booking Routes
  app.post("/api/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      const bookingData = z.object({
        pujaId: z.number(),
        type: z.enum(["offline", "online"]),
        consultationType: z.enum(["own_guruji", "auto_select", "immediate"]).optional(),
        amount: z.number().positive(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        time: z.string().optional(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        }),
        duration: z.number().positive().optional(),
        isImmediate: z.boolean().default(false),
        notes: z.string().optional(),
        gurujiId: z.number().optional(),
      }).parse(req.body);

      const date = new Date(bookingData.date);
      
      // Create booking
      const booking = await storageInstance.createBooking({
        customerId: userId,
        ...bookingData,
        date,
        city: bookingData.city || '',
      } as any);

      // If a specific guruji was selected, assign directly and notify only that guruji
      if (bookingData.gurujiId) {
        await storageInstance.assignGurujiToBooking(booking.id, bookingData.gurujiId);
        await storageInstance.updateBookingStatus(booking.id, 'confirmed');
        
        const guruji = await storageInstance.getGurujiProfile(bookingData.gurujiId);
        if (guruji) {
          const customer = await storageInstance.getUser(userId);
          await storageInstance.createNotification({
            userId: guruji.userId,
            title: 'New Booking Assigned',
            message: `A new puja booking has been assigned to you by ${customer?.firstName || 'a customer'}`,
            type: 'booking_confirmed',
          });
        }
      } else {
        // Auto-select or send to nearby gurujis
        await notifyGurujisPujaRequest(booking, bookingData.city || '');
      }

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const userRole = req.session.userRole as string;
      
      let bookings: any[] = [];
      
      if (userRole === "customer") {
        bookings = await storageInstance.getBookingsByCustomerId(userId);
      } else if (userRole === "guruji") {
        const gurujiProfile = await storageInstance.getGurujiProfileByUserId(userId);
        if (!gurujiProfile) {
          return res.status(404).json({ message: "Guruji profile not found" });
        }
        
        bookings = await storageInstance.getBookingsByGurujiId(gurujiProfile.id);
      } else if (userRole === "admin") {
        // Admin can see all bookings
        bookings = await storageInstance.getAllBookings();
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const booking = await storageInstance.getBooking(parseInt(id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const userId = req.session.userId as number;
      const userRole = req.session.userRole as string;
      
      // Check if user is authorized to view this booking
      if (userRole === "customer" && booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (userRole === "guruji") {
        const gurujiProfile = await storageInstance.getGurujiProfileByUserId(userId);
        if (!gurujiProfile || booking.gurujiId !== gurujiProfile.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.put("/api/bookings/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const { status } = z.object({
        status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
      }).parse(req.body);

      const booking = await storageInstance.getBooking(parseInt(id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const userId = req.session.userId as number;
      const userRole = req.session.userRole as string;
      
      // Check if user is authorized to update this booking
      if (userRole === "customer" && booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (userRole === "guruji") {
        const gurujiProfile = await storageInstance.getGurujiProfileByUserId(userId);
        if (!gurujiProfile || booking.gurujiId !== gurujiProfile.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedBooking = await storageInstance.updateBookingStatus(parseInt(id), status);
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.put("/api/bookings/:id/assign", isAuthenticated, checkRole(["guruji", "admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const { gurujiId } = z.object({
        gurujiId: z.number(),
      }).parse(req.body);

      const booking = await storageInstance.getBooking(parseInt(id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const updatedBooking = await storageInstance.assignGurujiToBooking(parseInt(id), gurujiId);
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error assigning guruji to booking:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to assign guruji to booking" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const notifications = await storageInstance.getNotifications(userId);
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const success = await storageInstance.markNotificationAsRead(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Admin Routes
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }).parse(req.body);

      const user = await storageInstance.getUserByEmail(email);
      
      if (!user || user.role !== "admin") {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in admin:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      // In a real implementation, we would implement pagination
      // Using proper storage method to get all users
      const users = await storageInstance.getAllUsers();
      
      // Remove passwords from the response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/block", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const success = await storageInstance.blockUser(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User blocked successfully" });
    } catch (error) {
      console.error("Error blocking user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.put("/api/admin/users/:id/unblock", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const success = await storageInstance.unblockUser(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  // Content Routes
  app.get("/api/content/:key", async (req: Request, res: Response) => {
    try {
      const { key } = z.object({
        key: z.string().min(1, "Key is required"),
      }).parse(req.params);

      const content = await storageInstance.getContent(key);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.put("/api/content/:key", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { key } = z.object({
        key: z.string().min(1, "Key is required"),
      }).parse(req.params);

      const { title, content } = z.object({
        title: z.string().min(1, "Title is required"),
        content: z.string().min(1, "Content is required"),
      }).parse(req.body);

      const updatedContent = await storageInstance.updateContent(key, title, content);
      
      if (!updatedContent) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating content:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.get("/api/availability", async (req: Request, res: Response) => {
    try {
      // Get query parameters
      const { date, gurujiId, pujaId, city } = req.query;
      
      // Generate dates for a month range
      const dates = [];
      const baseDate = date ? new Date(date as string) : new Date();
      const startDate = new Date(baseDate);
      startDate.setDate(1); // Start from the first day of the month
      
      const endDate = new Date(baseDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the month

      // Use the storage interface to get guruji users
      const allUsers = await Promise.all(
        Array.from({ length: 10 }, (_, i) => storageInstance.getUser(i + 1))
      );
      const users = allUsers.filter(user => user && user.role === 'guruji');
      
      // Generate a consistent city based on user ID
      const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai'];
      const getCityForUser = (userId: number) => cities[userId % cities.length];
      
      // Augment the User type to include required properties for the guruji profile
      interface GurujiWithProfile {
        id: number;
        userId: number;
        user: {
          id: number;
          firstName: string;
          lastName: string;
          email: string;
          role: string;
        };
        description: string;
        city: string;
        experience: number;
        rating: number;
        totalReviews: number;
        pricePerHour: number;
        isVerified: boolean;
        isAvailable: boolean;
        createdAt: Date;
        updatedAt: Date;
      }
      
      // Simulated guruji profiles
      let availableGurujis: GurujiWithProfile[] = users
        .filter((user): user is NonNullable<typeof user> => user !== undefined) // Filter out undefined users
        .map(user => {
          // Since we don't have city in the User schema, assign based on user ID
          const city = getCityForUser(user.id);
          
          return {
            id: user.id,
            userId: user.id,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role
            },
            description: "Experienced guruji specializing in traditional ceremonies",
            city, // Assigned city
            experience: Math.floor(Math.random() * 20) + 5,
            rating: (Math.random() * 2) + 3, // Rating between 3 and 5
            totalReviews: Math.floor(Math.random() * 100),
            pricePerHour: 1000 + (Math.floor(Math.random() * 2000)),
            isVerified: true,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });
      
      // Filter gurujis based on criteria
      if (pujaId) {
        // In a real app, we would filter gurujis who can perform this type of puja
        availableGurujis = availableGurujis.filter(guruji => 
          // For demonstration, filter randomly but consistently
          (guruji.id % parseInt(pujaId as string)) !== 0
        );
      }
      
      if (city) {
        // Filter gurujis by city
        availableGurujis = availableGurujis.filter(guruji => 
          guruji.city.toLowerCase() === (city as string).toLowerCase()
        );
      }
      
      if (gurujiId) {
        // If specific guruji is requested, only include that one
        availableGurujis = availableGurujis.filter(guruji => 
          guruji.id === parseInt(gurujiId as string)
        );
      }
      
      // If no gurujis match the criteria, return a couple of default ones
      if (availableGurujis.length === 0) {
        // Create some fallback gurujis if none match the criteria
        const defaultGuruji1: GurujiWithProfile = {
          id: 1001,
          userId: 1001,
          user: {
            id: 1001,
            firstName: "Amit",
            lastName: "Sharma",
            role: "guruji",
            email: "amit.sharma@example.com"
          },
          description: "Expert in traditional Hindu ceremonies",
          city: "Mumbai",
          experience: 15,
          rating: 4.8,
          totalReviews: 120,
          pricePerHour: 1500,
          isVerified: true,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const defaultGuruji2: GurujiWithProfile = {
          id: 1002,
          userId: 1002,
          user: {
            id: 1002,
            firstName: "Raj",
            lastName: "Verma",
            role: "guruji",
            email: "raj.verma@example.com"
          },
          description: "Specializes in family ceremonies and consultations",
          city: "Delhi",
          experience: 20,
          rating: 4.9,
          totalReviews: 150,
          pricePerHour: 1800,
          isVerified: true,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        availableGurujis = [defaultGuruji1, defaultGuruji2];
      }
      
      // Generate availability data for each day in the month
      for (let i = 0; i < endDate.getDate(); i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(i + 1);
        
        // Skip past dates
        if (currentDate < new Date(new Date().setHours(0, 0, 0, 0))) {
          continue;
        }
        
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const dayOfMonth = currentDate.getDate();
        const dayOfWeek = currentDate.getDay();
        
        // Generate consistent availability patterns based on date
        const slots = [];
        const startHour = 8;
        const endHour = isWeekend ? 20 : 18;
        
        // Check for existing bookings on this date
        // In a real app, we would query the database for actual bookings
        const dateString = currentDate.toISOString().split('T')[0];
        const existingBookings = []; // This would be fetched from DB in a real app
        
        for (let hour = startHour; hour < endHour; hour++) {
          // Determine slot availability based on consistent patterns
          // Using a deterministic algorithm so the same slots are consistently available/unavailable
          const hourSeed = hour + dayOfMonth + dayOfWeek;
          const slotAvailability = (hourSeed % 4 !== 0);
          
          // Reduced availability during peak hours (morning and evening pujas)
          const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 16 && hour <= 18);
          const peakHourAvailability = isPeakHour ? (hourSeed % 3 !== 0) : true;
          
          // Higher availability on weekends
          const weekendAvailability = isWeekend ? (hourSeed % 5 !== 0) : true;
          
          // Combined availability factors
          let available = slotAvailability && peakHourAvailability && weekendAvailability;
          
          // Format time properly with AM/PM
          const timeFormat = (h: number): string => {
            const hour12 = h % 12 || 12;
            const amPm = h < 12 ? 'AM' : 'PM';
            return `${hour12}:00 ${amPm}`;
          };
          
          // If slot is unavailable, assign a guruji
          let assignedGurujiId = undefined;
          let assignedGurujiName = undefined;
          
          if (!available && availableGurujis.length > 0) {
            const gurujiIndex = (hour + dayOfMonth) % availableGurujis.length;
            const assignedGuruji = availableGurujis[gurujiIndex];
            assignedGurujiId = assignedGuruji.id;
            assignedGurujiName = `${assignedGuruji.user.firstName} ${assignedGuruji.user.lastName}`;
          }
          
          slots.push({
            id: hour,
            startTime: timeFormat(hour),
            endTime: timeFormat(hour + 1),
            available,
            gurujiId: available ? undefined : assignedGurujiId,
            gurujiName: available ? undefined : assignedGurujiName
          });
        }
        
        // Only include days with at least one available slot
        if (slots.some(slot => slot.available)) {
          dates.push({
            date: dateString,
            slots
          });
        }
      }
      
      res.json(dates);
    } catch (error: any) {
      console.error("Availability error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Register payment routes
  registerPaymentRoutes(app);
  
  // Register chatbot routes
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api', journeyRoutes);
  app.use('/api/admin/pujas', pujaRoutes);
  app.use('/api/demo', demoRoutes);
  
  // ── Payment Settings (public read, admin write) ──────────────────────────
  app.get('/api/settings/payment', async (req: Request, res: Response) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.json({ paymentRequired: false, upiId: null, upiName: null, upiQrImageUrl: null });
      }
      const result = await pool.query('SELECT * FROM app_settings LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({ paymentRequired: false, upiId: null, upiName: null, upiQrImageUrl: null });
      }
      const row = result.rows[0];
      res.json({
        paymentRequired: row.payment_required,
        upiId: row.upi_id,
        upiName: row.upi_name,
        upiQrImageUrl: row.upi_qr_image_url,
      });
    } catch (err) {
      console.error('Error fetching payment settings:', err);
      res.json({ paymentRequired: false, upiId: null, upiName: null, upiQrImageUrl: null });
    }
  });

  app.put('/api/admin/settings/payment', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { paymentRequired, upiId, upiName, upiQrImageUrl } = req.body;
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ message: 'Database not available' });
      }
      await pool.query(
        `UPDATE app_settings SET payment_required=$1, upi_id=$2, upi_name=$3, upi_qr_image_url=$4, updated_at=NOW()`,
        [!!paymentRequired, upiId || null, upiName || null, upiQrImageUrl || null]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating payment settings:', err);
      res.status(500).json({ message: 'Failed to update payment settings' });
    }
  });

  // Register booking request routes
  app.post('/api/bookings/:id/send-requests', isAuthenticated, checkRole(['customer']), sendBookingRequests);
  app.post('/api/booking-requests/:id/respond', isAuthenticated, checkRole(['guruji']), respondToBookingRequest);
  app.post('/api/bookings/:id/cancel', isAuthenticated, checkRole(['guruji']), cancelBookingByGuruji);
  app.get('/api/guruji/booking-requests', isAuthenticated, checkRole(['guruji']), getGurujiBookingRequests);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize Socket.io
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  
  // Video conference API endpoints
  app.post("/api/video-conference", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      const { bookingId } = z.object({
        bookingId: z.number(),
      }).parse(req.body);

      // Get the booking
      const booking = await storageInstance.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Verify user is associated with this booking (either customer or guruji)
      const isCustomer = booking.customerId === userId;
      
      let isGuruji = false;
      if (req.session.userRole === "guruji") {
        const gurujiProfile = await storageInstance.getGurujiProfileByUserId(userId);
        isGuruji = gurujiProfile?.id === booking.gurujiId;
      }
      
      if (!isCustomer && !isGuruji) {
        return res.status(403).json({ message: "You are not authorized to start this call" });
      }
      
      // Generate a unique room ID using the booking ID
      const roomId = `booking-${bookingId}-${Date.now()}`;
      
      // Return the room ID
      res.json({ roomId, callerId: userId, calleeId: isCustomer ? booking.gurujiId : booking.customerId });
    } catch (error) {
      console.error("Error creating video conference:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to create video conference" });
    }
  });

  app.get("/api/video-conference/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string(),
      }).parse(req.params);
      
      // Extract booking ID from the room ID format "booking-{bookingId}-{timestamp}"
      const matches = id.match(/^booking-(\d+)-/);
      
      if (!matches || !matches[1]) {
        return res.status(400).json({ message: "Invalid video conference ID" });
      }
      
      const bookingId = parseInt(matches[1]);
      
      // Get the booking
      const booking = await storageInstance.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Return the call participants
      res.json({
        roomId: id,
        callerId: booking.customerId,
        calleeId: booking.gurujiId,
        booking
      });
    } catch (error) {
      console.error("Error fetching video conference:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to fetch video conference" });
    }
  });

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    // When a user joins a room
    socket.on("join-room", (roomId, userId) => {
      console.log(`User ${userId} joined room: ${roomId}`);
      socket.join(roomId);
      // Notify other users in the room
      socket.to(roomId).emit("user-connected", userId);
      
      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User ${userId} disconnected from room: ${roomId}`);
        socket.to(roomId).emit("user-disconnected", userId);
      });
    });
    
    // Handle video call signaling
    socket.on("callUser", ({ userToCall, signalData, from }) => {
      console.log(`Call from ${from} to user: ${userToCall}`);
      
      // Get caller info for display purposes
      const caller = {
        id: socket.id,
        name: "Caller" // In a real app, fetch user name from DB
      };
      
      io.to(userToCall).emit("incomingCall", { signal: signalData, caller });
    });
    
    socket.on("answerCall", ({ signal, to }) => {
      console.log(`Call answered by ${socket.id} to: ${to}`);
      io.to(to).emit("callAccepted", signal);
    });
    
    socket.on("rejectCall", ({ to }) => {
      console.log(`Call rejected by ${socket.id}`);
      io.to(to).emit("callRejected");
    });
    
    socket.on("endCall", ({ to }) => {
      console.log(`Call ended by ${socket.id}`);
      if (to) {
        io.to(to).emit("callEnded");
      }
    });
    
    socket.on("reject-call", ({ roomId, to }) => {
      console.log(`Call rejected in room: ${roomId}`);
      io.to(to).emit("call-rejected");
    });
    
    // Handle stream toggling
    socket.on("toggle-audio", ({ roomId, enabled }) => {
      socket.to(roomId).emit("user-toggle-audio", { userId: socket.id, enabled });
    });
    
    socket.on("toggle-video", ({ roomId, enabled }) => {
      socket.to(roomId).emit("user-toggle-video", { userId: socket.id, enabled });
    });
  });

  // Function to notify all qualified gurujis about a new puja request
  async function notifyGurujisPujaRequest(booking: any, city: string) {
    try {
      console.log(`🔔 Finding gurujis near ${city} (pincode: ${booking.pincode}) for booking #${booking.id}`);
      
      // Find verified gurujis by pincode (primary) or city (fallback)
      const nearbyGurujis = await storageInstance.getNearbyGurujis(
        city, 
        booking.pujaId, 
        20,
        booking.pincode
      );
      
      const verifiedGurujis = nearbyGurujis.filter((g: any) => g.aadharVerified && g.documentsVerified);
      
      console.log(`✓ Found ${verifiedGurujis.length} verified gurujis near ${city}`);

      if (verifiedGurujis.length > 0) {
        // Update booking status to pending_approval
        await storageInstance.updateBookingStatus(booking.id, 'pending_approval');

        for (const guruji of verifiedGurujis) {
          // Create booking request for each guruji
          await (storageInstance as any).createBookingRequest({
            bookingId: booking.id,
            gurujiId: guruji.id,
            status: 'pending',
          });

          // In-app notification
          await storageInstance.createNotification({
            userId: guruji.userId,
            title: '🔔 New Puja Request',
            message: `New ${booking.type === 'offline' ? 'in-person' : 'online'} puja request in ${city}. Tap to view details.`,
            type: 'booking_request',
          });

          // Emit Socket.IO notification directly to guruji's room
          io.to(`user_${guruji.userId}`).emit('newPujaRequest', {
            bookingId: booking.id,
            title: '🔔 New Puja Request',
            message: `New puja request in ${city}`,
            amount: booking.amount,
            date: booking.date,
            type: booking.type,
            city: city,
            pincode: booking.pincode,
            timestamp: new Date()
          });
        }
      } else {
        // Broadcast to all connected gurujis as fallback
        io.emit('newPujaRequest', {
          bookingId: booking.id,
          title: '🔔 New Puja Request',
          message: `New puja request in ${city}`,
          amount: booking.amount,
          date: booking.date,
          type: booking.type,
          city: city,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error in notifyGurujisPujaRequest:', error);
    }
  }

  // API endpoint for gurujis to accept/reject booking requests  
  app.post("/api/bookings/:bookingId/respond", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const { action } = req.body; // 'accept' or 'reject'
      
      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'reject'" });
      }
      
      if (action === 'accept') {
        // Update booking status to accepted
        console.log(`✅ Booking ${bookingId} accepted by guruji`);
        
        // Emit notification to disable acceptance for other gurujis
        io.emit('bookingAccepted', {
          bookingId: bookingId,
          message: 'This booking has been accepted by another guruji',
          timestamp: new Date()
        });
        
        res.json({ message: "Booking accepted successfully", bookingId });
      } else {
        console.log(`❌ Booking ${bookingId} rejected by guruji`);
        res.json({ message: "Booking rejected successfully" });
      }
    } catch (error) {
      console.error("Error responding to booking:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });
  
  // The video conference API routes are already defined above

  // ── Review / Rating Routes ───────────────────────────────────────────────

  // POST /api/reviews – customer submits a rating after a completed booking
  app.post('/api/reviews', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { bookingId, gurujiId, rating, review } = req.body;

      if (!bookingId || !gurujiId || !rating) {
        return res.status(400).json({ message: 'bookingId, gurujiId and rating are required' });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      // Ensure booking belongs to this customer and is completed
      const booking = await storageInstance.getBooking(parseInt(bookingId));
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.customerId !== userId) return res.status(403).json({ message: 'Forbidden' });
      if (booking.status !== 'completed') {
        return res.status(400).json({ message: 'You can only rate completed bookings' });
      }

      // Prevent duplicate reviews
      const existing = await storageInstance.getReviewByBookingId(parseInt(bookingId));
      if (existing) return res.status(409).json({ message: 'You have already rated this booking' });

      const created = await storageInstance.createReview({
        bookingId: parseInt(bookingId),
        customerId: userId,
        gurujiId: parseInt(gurujiId),
        rating: parseInt(rating),
        review: review || null,
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  // GET /api/reviews/booking/:bookingId – check if review exists for a booking
  app.get('/api/reviews/booking/:bookingId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const review = await storageInstance.getReviewByBookingId(bookingId);
      res.json(review || null);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch review' });
    }
  });

  // GET /api/reviews/guruji/:gurujiId – public list of reviews for a guruji
  app.get('/api/reviews/guruji/:gurujiId', async (req: Request, res: Response) => {
    try {
      const gurujiId = parseInt(req.params.gurujiId);
      const reviews = await storageInstance.getReviewsByGurujiId(gurujiId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  // ── Sales Rep Routes ─────────────────────────────────────────────────────

  // POST /api/sales-rep/login – dedicated login for sales reps using DB storage
  app.post('/api/sales-rep/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await storageInstance.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      if (user.role !== 'sales_rep' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Not a sales representative.' });
      }
      if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });

      const isValid = await storageInstance.verifyPassword(user.id, password);
      if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Sales rep login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  const isSalesRep = checkRole(['sales_rep', 'admin']);

  // GET /api/sales-rep/registrations – list users registered by this sales rep
  app.get('/api/sales-rep/registrations', isAuthenticated, isSalesRep, async (req: Request, res: Response) => {
    try {
      const salesRepId = req.session.userId!;
      const users = await storageInstance.getUsersByRegisteredBy(salesRepId);
      const safe = users.map(({ password: _, ...u }) => u);
      res.json(safe);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch registrations' });
    }
  });

  // POST /api/sales-rep/register-customer – sales rep registers a new customer
  app.post('/api/sales-rep/register-customer', isAuthenticated, isSalesRep, async (req: Request, res: Response) => {
    try {
      const salesRepId = req.session.userId!;
      const {
        firstName, lastName, email, mobile, password,
        age, gender, dob, aadhar, caste, address, city, state, pincode, photoUrl
      } = req.body;

      if (!firstName || !lastName || !email || !mobile || !password) {
        return res.status(400).json({ message: 'First name, last name, email, mobile and password are required' });
      }

      // Check for duplicates
      const existingEmail = await storageInstance.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ message: 'Email already registered' });
      const existingMobile = await storageInstance.getUserByMobile(mobile);
      if (existingMobile) return res.status(409).json({ message: 'Mobile number already registered' });

      const user = await storageInstance.createUser({
        firstName, lastName, email, mobile, password,
        age: age ? parseInt(age) : 0,
        gender: gender || 'other',
        role: 'customer',
        dob: dob || null,
        aadhar: aadhar || null,
        caste: caste || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        photoUrl: photoUrl || null,
        registeredBy: salesRepId,
      } as any);

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error('Error registering customer:', error);
      res.status(500).json({ message: 'Failed to register customer' });
    }
  });

  // POST /api/sales-rep/register-guruji – sales rep registers a new guruji with KYC + profile
  app.post('/api/sales-rep/register-guruji', isAuthenticated, isSalesRep, async (req: Request, res: Response) => {
    try {
      const salesRepId = req.session.userId!;
      const {
        firstName, lastName, email, mobile,
        age, gender, dob, aadhar, caste, religion, address, city, state, pincode, photoUrl,
        bio, experience, location, pricePerHour, cities, pujas, languages,
        isOnline, isOffline, isConsultation, certificates, videoUrl
      } = req.body;

      if (!firstName || !lastName || !email || !mobile || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'First name, last name, email, and valid 10-digit mobile are required' });
      }

      const existingEmail = await storageInstance.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ message: 'Email already registered' });
      const existingMobile = await storageInstance.getUserByMobile(mobile);
      if (existingMobile) return res.status(409).json({ message: 'Mobile number already registered' });

      // Create user with guruji role - password is 10-digit mobile number
      const user = await storageInstance.createUser({
        firstName, lastName, email, mobile, password: mobile,
        age: age ? parseInt(age) : 0,
        gender: gender || 'male',
        role: 'guruji',
        dob: dob || null,
        aadhar: aadhar || null,
        caste: caste || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        photoUrl: photoUrl || null,
        registeredBy: salesRepId,
      } as any);

      // Create guruji profile
      const specialities = Array.isArray(pujas) ? pujas : [];
      const gurujiProfile = await storageInstance.createGurujiProfile({
        userId: user.id,
        bio: bio || '',
        experience: experience ? parseInt(experience) : 0,
        location: address || location || city || '',
        pricePerHour: pricePerHour ? parseInt(pricePerHour) : 500,
        languages: Array.isArray(languages) ? languages : [],
        specialization: specialities.join(', '),
        isOnline: isOnline ?? false,
        isOffline: isOffline ?? true,
        isConsultation: isConsultation ?? false,
        status: 'pending',
        profilePictureUrl: photoUrl || null,
        certificates: Array.isArray(certificates) ? certificates : [],
        // Location fields
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        address: address || null,
        // KYC fields
        age: age ? parseInt(age) : null,
        religion: religion || null,
        videoUrl: videoUrl || null,
      } as any);

      const { password: _, ...safeUser } = user;
      res.status(201).json({ user: safeUser, profile: gurujiProfile });
    } catch (error) {
      console.error('Error registering guruji:', error);
      res.status(500).json({ message: 'Failed to register guruji' });
    }
  });

  // Return the server instance
  return httpServer;
}
