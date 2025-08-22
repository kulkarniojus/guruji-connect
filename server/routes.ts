import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage, IStorage, MemStorage } from "./storage";
import { DBStorage } from "./dbStorage";

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

// Initialize admin user if it doesn't exist
async function initializeAdminUser() {
  try {
    const adminUser = await storageInstance.getUserByEmail("admin@admin.com");
    if (!adminUser) {
      await storageInstance.createUser({
        name: "Administrator",
        email: "admin@admin.com", 
        mobile: "9999999999",
        password: "admin",
        role: "admin",
        isActive: true,
        isBlocked: false
      });
      console.log("✓ Admin user created: admin@admin.com / admin");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize admin user
  await initializeAdminUser();

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

      // Check if user exists with this email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return res.status(403).json({ message: "Your account has been blocked" });
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
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
      
      // Find admin user
      const user = await storageInstance.getUserByEmail(email);
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password
      const isValidPassword = await storageInstance.verifyPassword(user.id, password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
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
      
      // Get gurujis filtered by city and puja specialization  
      const gurujis = await storageInstance.getGurujisByFilters({
        city: city as string,
        pujaId: pujaId ? parseInt(pujaId as string) : undefined,
        specialization: specialization as string,
        status: 'approved' // Only show approved gurujis
      });
      
      res.json(gurujis);
    } catch (error) {
      console.error('Error fetching gurujis:', error);
      res.status(500).json({ message: 'Failed to fetch gurujis' });
    }
  });

  // Guruji Registration Routes
  app.post('/api/guruji/register', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        bio, experience, location, pricePerHour, cities, pujas, languages,
        isOnline, isOffline, isConsultation, aadharNumber, profilePicture, certificates
      } = req.body;

      // Check if user already has a guruji profile
      const existingProfile = await storageInstance.getGurujiProfileByUserId(userId);
      if (existingProfile) {
        return res.status(400).json({ message: 'You already have a Guruji application' });
      }

      // Create guruji profile with pending status
      const gurujiProfile = await storageInstance.createGurujiProfile({
        userId,
        bio,
        experience,
        specialization: pujas.join(','), // Store as comma-separated for now
        location,
        pricePerHour,
        cities: cities, // Array of city IDs
        maxCities: 2,
        languages: languages,
        isOnline: isOnline || false,
        isOffline: isOffline || true,
        isConsultation: isConsultation || false,
        isAvailable: false, // Not available until approved
        aadharVerified: false, // Pending verification
        documentsVerified: false, // Pending verification
        status: 'pending',
        rating: 0,
        totalReviews: 0,
        profilePictureUrl: profilePicture || null,
        certificates: certificates || []
      });

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
      const gurujis = await storageInstance.getAllGurujiProfiles();
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
      
      res.json({
        message: 'Guruji application rejected',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Error rejecting guruji:', error);
      res.status(500).json({ message: 'Failed to reject guruji' });
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

      // Check if user already exists
      const existingUser = await storage.getUserByMobile(mobile);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this mobile number" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "User already exists with this email" });
      }

      // Hash the password
      const salt = await genSalt(10);
      const hashedPassword = await hash(password, salt);

      // Create user
      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        mobile,
        age,
        gender,
        password: hashedPassword,
        role,
        aadhar,
        caste,
      });

      // If user is guruji, create a default profile
      if (role === "guruji") {
        await storage.createGurujiProfile({
          userId: user.id,
          bio: "",
          experience: 0,
          specialization: "",
          location: "",
          radius: 10,
          isOnline: false,
          isOffline: true,
          isConsultation: false,
        });
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
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
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

      const user = await storage.getUserByEmail(email as string);
      
      if (user) {
        const { password, ...userWithoutPassword } = user;
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
      const pujas = await storage.getAllPujas();
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
      const newPuja = await storage.createPuja(pujaData);
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
      const updatedPuja = await storage.updatePuja(id, pujaData);
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
      const success = await storage.deletePuja(id);
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

      const pujas = await storage.searchPujas(query as string);
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

      const puja = await storage.getPuja(parseInt(id));
      
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
        city: z.string(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        }),
        duration: z.number().positive(),
        isImmediate: z.boolean().default(false),
        notes: z.string().optional(),
        gurujiId: z.number().optional(),
      }).parse(req.body);

      const date = new Date(bookingData.date);
      
      // Create booking
      const booking = await storage.createBooking({
        customerId: userId,
        ...bookingData,
        date,
      });

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
        bookings = await storage.getBookingsByCustomerId(userId);
      } else if (userRole === "guruji") {
        const gurujiProfile = await storage.getGurujiProfileByUserId(userId);
        if (!gurujiProfile) {
          return res.status(404).json({ message: "Guruji profile not found" });
        }
        
        bookings = await storage.getBookingsByGurujiId(gurujiProfile.id);
      } else if (userRole === "admin") {
        // Admin can see all bookings (would implement pagination in a real app)
        // This is a simplified version for the memory storage implementation
        bookings = [];
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

      const booking = await storage.getBooking(parseInt(id));
      
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
        const gurujiProfile = await storage.getGurujiProfileByUserId(userId);
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

      const booking = await storage.getBooking(parseInt(id));
      
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
        const gurujiProfile = await storage.getGurujiProfileByUserId(userId);
        if (!gurujiProfile || booking.gurujiId !== gurujiProfile.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedBooking = await storage.updateBookingStatus(parseInt(id), status);
      
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

      const booking = await storage.getBooking(parseInt(id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const updatedBooking = await storage.assignGurujiToBooking(parseInt(id), gurujiId);
      
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
      const notifications = await storage.getNotifications(userId);
      
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

      const success = await storage.markNotificationAsRead(parseInt(id));
      
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

      const user = await storage.getUserByEmail(email);
      
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
      const users = await storage.getAllUsers();
      
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

      const success = await storage.blockUser(parseInt(id));
      
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

      const success = await storage.unblockUser(parseInt(id));
      
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

      const content = await storage.getContent(key);
      
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

      const updatedContent = await storage.updateContent(key, title, content);
      
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
        Array.from({ length: 10 }, (_, i) => storage.getUser(i + 1))
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
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Verify user is associated with this booking (either customer or guruji)
      const isCustomer = booking.customerId === userId;
      
      let isGuruji = false;
      if (req.session.userRole === "guruji") {
        const gurujiProfile = await storage.getGurujiProfileByUserId(userId);
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
      const booking = await storage.getBooking(bookingId);
      
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
  
  // The video conference API routes are already defined above

  // Return the server instance
  return httpServer;
}
