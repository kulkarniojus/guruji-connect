import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import { genSalt, hash, compare } from "bcrypt";
import { generateOTP, isValidOTP } from "./services/otp";
import { sendSMS, sendEmail } from "./services/notification";
import session from "express-session";
import MemoryStore from "memorystore";
import { fromZodError } from "zod-validation-error";
import { registerPaymentRoutes } from "./routes/payment";

// Extend session type to include userId and userRole
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Authentication Routes
  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { mobile } = z.object({
        mobile: z.string().length(10, "Mobile number must be 10 digits"),
      }).parse(req.body);

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

      await storage.createOtp({
        mobile,
        otp,
        expiresAt,
      });

      // In a production environment, we would send the OTP via SMS
      // For now, log it to console for testing
      console.log(`OTP for ${mobile}: ${otp}`);
      
      // Simulate sending SMS
      // await sendSMS(mobile, `Your OTP for PujaConnect is: ${otp}`);

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { mobile, otp } = z.object({
        mobile: z.string().length(10, "Mobile number must be 10 digits"),
        otp: z.string().length(6, "OTP must be 6 digits"),
      }).parse(req.body);

      const isValid = await storage.verifyOtp(mobile, otp);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Check if user exists
      const user = await storage.getUserByMobile(mobile);
      if (user) {
        // User exists, set session
        req.session.userId = user.id;
        req.session.userRole = user.role;
        return res.json({ user });
      }

      res.json({ exists: false, message: "OTP verified, user not registered" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { mobile, otp } = z.object({
        mobile: z.string().length(10, "Mobile number must be 10 digits"),
        otp: z.string().length(6, "OTP must be 6 digits"),
      }).parse(req.body);

      const isValid = await storage.verifyOtp(mobile, otp);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Check if user exists
      const user = await storage.getUserByMobile(mobile);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return res.status(403).json({ message: "Your account has been blocked" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
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

      // Create user
      const user = await storage.createUser({
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
      const { mobile } = z.object({
        mobile: z.string().length(10, "Mobile number must be 10 digits"),
      }).parse(req.query);

      const user = await storage.getUserByMobile(mobile as string);
      
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
      // For this memory storage implementation, we'll just return all users
      const users = Array.from(storage["users"].values()).map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(users);
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

  // Register payment routes
  registerPaymentRoutes(app);
  
  // API endpoint for calendar availability
  app.get("/api/availability", async (req: Request, res: Response) => {
    try {
      const gurujiId = req.query.gurujiId ? Number(req.query.gurujiId) : undefined;
      const pujaId = req.query.pujaId ? Number(req.query.pujaId) : undefined;
      
      // For now, generating mock data as this will later be connected to real data
      const today = new Date();
      const availability = [];
      
      // Generate availability for the next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Random availability type
        const types = ['high', 'medium', 'low', 'none'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        // Generate time slots
        const slots = [];
        const startHour = 8; // 8 AM
        const endHour = 20; // 8 PM
        
        for (let hour = startHour; hour < endHour; hour++) {
          // 30-minute increments
          for (let minute of [0, 30]) {
            // More complex availability logic can be implemented here
            // For example, based on gurujiId, pujaId, day of week, etc.
            let isAvailable = Math.random() > 0.3; // 70% chance of being available
            
            // Make weekends less available
            if (date.getDay() === 0 || date.getDay() === 6) {
              isAvailable = Math.random() > 0.6;
            }
            
            slots.push({
              time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
              isAvailable
            });
          }
        }
        
        availability.push({
          date: date.toISOString().split('T')[0],
          slots,
          type: randomType
        });
      }
      
      res.json(availability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ message: "Error fetching availability" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Return the server instance
  return httpServer;
}
