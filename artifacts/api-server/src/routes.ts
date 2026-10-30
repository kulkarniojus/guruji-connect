import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage, IStorage, MemStorage } from "./storage";
import { DBStorage } from "./dbStorage";
import { pool } from './db';
import { initializeGurujiPush, startGurujiPushWorker, gurujiPushRouter } from './gurujiPush';
import { getBusyGurujiIds, parseBookingTime, validBookingDate } from './bookingSchedule';
import { createPujaPayload, updatePujaPayload } from './pujaValidation';
import { changeBookingCompletion, initializeBookingCompletion } from './bookingCompletion';
import { bookingCompletionRouter } from './routes/booking-completion';
import { initializeBookingCommunications } from './bookingCommunications';
import { initializeBookingSamagri, bookingSamagriRouter } from './bookingSamagri';
import { initializeEvents } from './eventsModel';
import { eventsRouter } from './eventsRoutes';
import { eventMediaRouter } from './eventMedia';
import { bookingCommunicationsRouter } from './routes/booking-communications';
import { initializePujaPricing, getPricingQuote, pricingQuotePayload, validatePujaPriceRules } from './pujaPricing';
import { initializePujaCommissions } from './pujaCommission';
import { commissionsRouter } from './routes/commissions';
import { publicPricingRouter, adminPricingRouter, adminPujaPriceRouter } from './routes/puja-pricing';
import { initializeOurServices, servicesRouter, adminServicesRouter } from './ourServices';
import { gurujiFirstName } from '@workspace/portal-shared/gurujiDisplayName';
import { addressesRouter } from './routes/addresses';
import { participantNotification } from './supportTeamNotifications';
import { initializeCancellations } from './cancellationPolicy';
import { initializeCustomerFinance } from './customerFinance';
import { customerFinanceRouter } from './routes/customerFinance';
import { initializeCustomerRefunds } from './customerRefunds';
import { refundsRouter } from './routes/refunds';
import { initializeGurujiFinance } from './gurujiFinanceStore';
import { startGurujiFinanceScheduler } from './gurujiFinanceScheduler';
import { gurujiFinanceRouter } from './routes/guruji-finance';
import { cancellationsRouter } from './routes/cancellations';
import { initializePaymentStorage, initializeStripeGateway, paymentSettings, savePaymentSettings,
  startCheckout, checkoutResult, processPaymentWebhook, checkoutReturnOrigin } from './stripePayments';

// Use database storage in production, memory storage for quick testing
const storageInstance = process.env.DATABASE_URL ? new DBStorage() : storage;
import { bookingStatusLabel } from '@workspace/portal-shared/bookingLifecycle';
import { z } from "zod";
import { ZodError } from "zod";
import { genSalt, hash, compare } from "bcrypt";
import { generateOTP, isValidOTP } from "./services/otp";
import { sendSMS, sendEmail } from "./services/notification";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fromZodError } from "zod-validation-error";
import chatbotRoutes from "./routes/chatbot";
import { analyticsRouter } from "./routes/analytics";
import journeyRoutes from "./routes/journey";
import pujaRoutes from "./routes/pujas";
import { initializeGurujiAvailability, gurujiAvailabilityRouter } from './gurujiAvailability';
import { isAuthenticated as requireAuthenticated } from './middlewares/auth';
import { isSampleAccount, startUserSession, disableSampleAccounts } from './authAccess';
import { reconcileDeclinedBookings } from './bookingDeclines';
import { ageFromDateOfBirth, validateStaffRegistration } from './registrationValidation';
import { submitGurujiApplication } from './gurujiApplication';
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

const PgStore = connectPgSimple(session);

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

// Seed sample gurujis into DB if they don't exist (for demo/testing)
async function seedSampleGurujisToDB() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { genSalt, hash: bcryptHash } = await import('bcrypt');
    const salt = await genSalt(10);

    const sampleGurujis = [
      {
        email: "ramesh.sharma@gurujiconnect.com",
        mobile: "9876543210",
        firstName: "Pandit Ramesh", lastName: "Sharma",
        bio: "Experienced Vedic priest with deep knowledge of Sanskrit shlokas and traditional rituals.",
        city: "mumbai", location: "Mumbai", experience: 15, pricePerHour: 1200,
        specialities: ["Satyanarayan Puja", "Griha Pravesh", "Navgraha Shanti", "Ganesh Puja"],
        languages: ["Hindi", "Sanskrit", "Marathi"], rating: 4.8, totalReviews: 156,
        profilePic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      },
      {
        email: "priya.devi@gurujiconnect.com",
        mobile: "9876543211",
        firstName: "Acharya Priya", lastName: "Devi",
        bio: "Spiritual guide specializing in meditation, yoga, and holistic wellness practices.",
        city: "delhi", location: "Delhi", experience: 12, pricePerHour: 1500,
        specialities: ["Navgraha Shanti", "Mahalakshmi Puja", "Satyanarayan Puja", "Ganesh Puja"],
        languages: ["Hindi", "English", "Sanskrit"], rating: 4.9, totalReviews: 203,
        profilePic: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      },
      {
        email: "suresh.kumar@gurujiconnect.com",
        mobile: "9876543212",
        firstName: "Pandit Suresh", lastName: "Kumar",
        bio: "Expert astrologer and Vastu consultant with 20+ years of experience.",
        city: "bangalore", location: "Bangalore", experience: 20, pricePerHour: 1000,
        specialities: ["Griha Pravesh", "Navgraha Shanti", "Satyanarayan Puja", "Ganesh Puja"],
        languages: ["Hindi", "Kannada", "Tamil", "English"], rating: 4.7, totalReviews: 178,
        profilePic: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
      },
      {
        email: "vijay.mishra@gurujiconnect.com",
        mobile: "9876543213",
        firstName: "Pandit Vijay", lastName: "Mishra",
        bio: "Traditional priest specializing in wedding ceremonies, Navgraha Shanti, and Ganesh Puja.",
        city: "ahmedabad", location: "Ahmedabad", experience: 18, pricePerHour: 1100,
        specialities: ["Ganesh Puja", "Navgraha Shanti", "Satyanarayan Puja", "Mahalakshmi Puja"],
        languages: ["Hindi", "Gujarati", "Sanskrit"], rating: 4.6, totalReviews: 134,
        profilePic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
      },
      {
        email: "anita.joshi@gurujiconnect.com",
        mobile: "9876543214",
        firstName: "Pandit Anita", lastName: "Joshi",
        bio: "Vedic pandit specializing in all types of pujas for families across Mumbai and Pune.",
        city: "mumbai", location: "Mumbai", experience: 10, pricePerHour: 900,
        specialities: ["Satyanarayan Puja", "Ganesh Puja", "Mahalakshmi Puja", "Griha Pravesh"],
        languages: ["Hindi", "Marathi", "English"], rating: 4.5, totalReviews: 98,
        profilePic: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
      },
      {
        email: "krishna.sharma@gurujiconnect.com",
        mobile: "9876543215",
        firstName: "Pandit Krishna", lastName: "Sharma",
        bio: "Renowned Vedic scholar available for all ceremonies in Delhi NCR.",
        city: "delhi", location: "Delhi", experience: 22, pricePerHour: 2000,
        specialities: ["Satyanarayan Puja", "Navgraha Shanti", "Griha Pravesh", "Ganesh Puja"],
        languages: ["Hindi", "Sanskrit", "English"], rating: 5.0, totalReviews: 312,
        profilePic: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop",
      },
    ];

    for (const g of sampleGurujis) {
      // Check if user already exists by email OR mobile
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1 OR mobile = $2`,
        [g.email, g.mobile]
      );
      if (existing.rows.length > 0) {
        // User exists — make sure their guruji profile is approved/verified
        const userId = existing.rows[0].id;
        await pool.query(
          `UPDATE guruji_profiles SET "isVerified" = true, "isAvailable" = true, 
           aadhar_verified = true, documents_verified = true, status = 'approved',
           city = CASE WHEN city = '' OR city IS NULL THEN $2 ELSE city END,
           specialities = CASE WHEN specialities = '{}' OR specialities IS NULL THEN $3 ELSE specialities END,
           "updatedAt" = NOW()
           WHERE "userId" = $1`,
          [userId, g.city, g.specialities]
        );
        continue;
      }

      const hashedPwd = await bcryptHash(g.mobile, salt);
      const userRes = await pool.query(
        `INSERT INTO users ("firstName", "lastName", email, mobile, password, role, "isVerified", "isBlocked", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'guruji', true, false, NOW(), NOW()) RETURNING id`,
        [g.firstName, g.lastName, g.email, g.mobile, hashedPwd]
      );
      const userId = userRes.rows[0].id;

      await pool.query(
        `INSERT INTO guruji_profiles ("userId", description, city, address, experience, "pricePerHour",
          "isVerified", "isAvailable", languages, specialities, rating, "totalReviews",
          aadhar_verified, documents_verified, status, profile_picture_url, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, $9, $10, true, true, 'approved', $11, NOW(), NOW())`,
        [userId, g.bio, g.city, g.location, g.experience, g.pricePerHour,
         g.languages, g.specialities, g.rating, g.totalReviews, g.profilePic]
      );
    }

    console.log("Sample guruji accounts created (password = mobile number):");
    for (const g of sampleGurujis) {
      console.log(`  ${g.email} / ${g.mobile}`);
    }
  } catch (err) {
    console.error("Warning: could not seed sample gurujis:", err);
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

// Convert puja IDs (numeric strings) to puja names for consistent storage
async function resolvePujaNames(pujas: any[]): Promise<string[]> {
  if (!pujas || pujas.length === 0) return [];
  // Check if values look like numeric IDs
  const allNumeric = pujas.every(p => !isNaN(Number(p)));
  if (allNumeric && process.env.DATABASE_URL) {
    const ids = pujas.map(p => Number(p));
    const result = await pool.query(`SELECT id, name FROM pujas WHERE id = ANY($1)`, [ids]);
    const nameMap: Record<number, string> = {};
    result.rows.forEach((r: any) => { nameMap[r.id] = r.name; });
    return ids.map(id => nameMap[id]).filter(Boolean);
  }
  // Already strings/names — return as-is
  return pujas.map(String).filter(Boolean);
}

export async function registerRoutes(app: Express): Promise<Server> {
  await initializeBookingCompletion();
  await initializeBookingCommunications();
  await initializeBookingSamagri();
  await initializeEvents();
  await initializeCancellations();
  await initializePujaPricing();
  await initializePujaCommissions();
  await initializeGurujiFinance();
  await initializeCustomerFinance();
  await initializeCustomerRefunds();
  await initializeOurServices();
  await disableSampleAccounts();
  await initializeGurujiAvailability();
  await reconcileDeclinedBookings();
  // The live bookings table predates the duration field in the shared schema.
  // Snapshot the configured duration so later admin edits do not change
  // the reserved length of bookings already placed.
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration INTEGER');
  await pool.query(`
    UPDATE bookings b SET duration = p.duration
    FROM pujas p WHERE b."pujaId" = p.id AND b.duration IS NULL
  `);
  // Initialize admin user and app settings
  await initializeAppSettings();
  await initializePaymentStorage();
  await initializeStripeGateway();
  // No sample accounts are created or re-enabled on application startup.

  // Set up session middleware — use PostgreSQL store so sessions survive restarts
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be configured');
  const sessionMiddleware = session({
      store: new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
      },
    });
  app.use(sessionMiddleware);
  // Session table must exist before the additive request push trigger is installed.
  await pool.query(`CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL
  )`);
  await initializeGurujiPush();
  startGurujiPushWorker();
  app.use('/api/mobile/push',gurujiPushRouter);

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
  const isAuthenticated = requireAuthenticated;

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
  app.use('/api', bookingSamagriRouter);
  app.use('/api', eventsRouter);
  app.use('/api', eventMediaRouter);
  app.use('/api/guruji/availability', isAuthenticated, gurujiAvailabilityRouter);
  app.get('/api/availability', isAuthenticated, checkRole(['guruji']), (_req, res) => {
    res.redirect(307, '/api/guruji/availability');
  });

  // Authentication Routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().trim().toLowerCase().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }).parse(req.body);

      // Look up user in database
      const user = await storageInstance.getUserByEmail(email);
      if (!user || isSampleAccount(user.email)) {
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
      await startUserSession(req, user);

      // Return user without password
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
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
      
      if (!user || user.role !== 'admin' || user.isBlocked || isSampleAccount(user.email)) {
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
      await startUserSession(req, user);
      
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
  app.post('/api/db/init', isAuthenticated, checkRole(['admin']), async (req: Request, res: Response) => {
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
  app.use('/api/services', servicesRouter);
  app.use('/api/addresses', addressesRouter);
  app.use('/api/admin/services', isAuthenticated, isAdmin, adminServicesRouter);
  app.get('/api/admin/cities', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      res.json(await storageInstance.getAllCities());
    } catch {
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });
  app.get('/api/cities', async (req: Request, res: Response) => {
    try {
      const cities = await storageInstance.getAllCities();
      res.json(cities.filter(city => city.isActive !== false));
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
      const updates = z.object({
        name: z.string().trim().min(1).optional(),
        state: z.string().trim().min(1).optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);
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
      const { city, pujaId, specialization, date, time } = req.query;
      let schedule: { date: string; time: string; duration: number } | undefined;
      if (date !== undefined || time !== undefined) {
        const requestedDate = String(date || '');
        const requestedTime = String(time || '');
        const requestedPujaId = Number(pujaId);
        if (!validBookingDate(requestedDate) || parseBookingTime(requestedTime) === null ||
            !Number.isInteger(requestedPujaId) || requestedPujaId <= 0) {
          return res.status(400).json({ message: 'A valid date, time and puja are required' });
        }
        const puja = await storageInstance.getPuja(requestedPujaId);
        if (!puja || !Number.isInteger(puja.duration) || puja.duration < 0 || puja.duration > 1440) {
          return res.status(400).json({ message: 'Puja duration is not configured' });
        }
        schedule = { date: requestedDate, time: requestedTime, duration: puja.duration };
      }

      // Preserve the approved, verified, city and puja checks while excluding
      // specialists occupied for the full requested service duration.
      const gurujis = await storageInstance.getGurujisByFilters({
        city: city as string,
        pujaId: pujaId ? parseInt(pujaId as string) : undefined,
        specialization: specialization as string,
        ...schedule,
      });
      res.json(gurujis.map(guruji => {
        const {email, mobile, ...publicProfile} = guruji as any;
        return publicProfile;
      }));
    } catch (error) {
      console.error('Error fetching gurujis:', error);
      res.status(500).json({ message: 'Failed to fetch gurujis' });
    }
  });

  // Guruji Registration Routes
  app.post('/api/guruji/register', isAuthenticated, submitGurujiApplication);

  // Admin routes for guruji approval
  app.get('/api/admin/gurujis', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const gurujis = await storageInstance.getAllGurujiProfiles(status);
      const enriched = await Promise.all(gurujis.map(async (g: any) => {
        const user = await storageInstance.getUser(g.userId);
        return {
          ...g,
          user: user || { firstName: '', lastName: '', email: '', mobile: '' },
        };
      }));
      res.json(enriched);
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
          message: 'Congratulations! Your Guruji registration has been approved. You are now a verified Guruji on Vaidik Dhara.',
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
      const gurujiId = Number(req.body.gurujiId);
      if (!Number.isInteger(gurujiId) || gurujiId <= 0) return res.status(400).json({ message: 'Valid gurujiId is required' });

      const booking = await storageInstance.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (!['pending', 'pending_approval'].includes(booking.status)) {
        return res.status(409).json({ message: 'Only pending bookings can be sent to a Guruji' });
      }

      const guruji = await storageInstance.getGurujiProfile(gurujiId);
      if (!guruji) return res.status(404).json({ message: 'Guruji not found' });
      const requests = await storageInstance.getBookingRequestsByBookingId(bookingId);
      if (requests.some((request: any) => request.gurujiId === gurujiId && request.status === 'pending')) {
        return res.status(409).json({ message: 'This Guruji already has a pending request' });
      }
      await storageInstance.createBookingRequest({ bookingId, gurujiId, status: 'pending' });
      await storageInstance.updateBookingStatus(bookingId, 'pending_approval');
      await storageInstance.createNotification({
        userId: guruji.userId,
        title: 'Booking Request from Vaidik Dhara Support Team',
        message: `Please accept or decline booking #${bookingId}.`,
        type: 'booking_request',
      });

      res.json({ message: 'Booking request sent to Guruji for acceptance' });
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

      if (booking.gurujiId || !['pending', 'pending_approval'].includes(booking.status)) {
        return res.status(409).json({ message: 'Only active unassigned bookings can be sent to Gurujis' });
      }
      const verifiedGurujis = await eligiblePujaRequestGurujis(booking, booking.city || '');

      if (verifiedGurujis.length === 0) {
        return res.status(400).json({ message: 'No eligible Gurujis are currently available for this puja in the selected location' });
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
  // Admin: edit a guruji's profile details
  app.put('/api/admin/gurujis/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const gurujiId = parseInt(req.params.id);
      const { city, state, address, pincode, experience, pricePerHour, bio, languages, religion, age } = req.body;

      if (city !== undefined && city.trim().length < 2) {
        return res.status(400).json({ message: 'City must be at least 2 characters' });
      }
      if (experience !== undefined && (isNaN(Number(experience)) || Number(experience) < 1)) {
        return res.status(400).json({ message: 'Years of experience must be at least 1' });
      }
      if (pricePerHour !== undefined && (isNaN(Number(pricePerHour)) || Number(pricePerHour) < 100)) {
        return res.status(400).json({ message: 'Price per hour must be at least ₹100' });
      }

      const updates: any = {};
      if (city !== undefined) updates.city = city.trim();
      if (state !== undefined) updates.state = state.trim();
      if (address !== undefined) updates.address = address.trim();
      if (pincode !== undefined) updates.pincode = pincode.trim();
      if (experience !== undefined) updates.experience = Number(experience);
      if (pricePerHour !== undefined) updates.pricePerHour = Number(pricePerHour);
      if (bio !== undefined) updates.bio = bio.trim();
      if (languages !== undefined) updates.languages = Array.isArray(languages) ? languages : [];
      if (religion !== undefined) updates.religion = religion;
      if (age !== undefined) updates.age = Number(age);

      // Use raw DB update with correct column names
      const { pool } = await import('./db');
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (updates.city !== undefined) { setClauses.push(`city = $${idx++}`); values.push(updates.city); }
      if (updates.state !== undefined) { setClauses.push(`state = $${idx++}`); values.push(updates.state); }
      if (updates.address !== undefined) { setClauses.push(`address = $${idx++}`); values.push(updates.address); }
      if (updates.pincode !== undefined) { setClauses.push(`pincode = $${idx++}`); values.push(updates.pincode); }
      if (updates.experience !== undefined) { setClauses.push(`experience = $${idx++}`); values.push(updates.experience); }
      if (updates.pricePerHour !== undefined) { setClauses.push(`"pricePerHour" = $${idx++}`); values.push(updates.pricePerHour); }
      if (updates.bio !== undefined) { setClauses.push(`description = $${idx++}`); values.push(updates.bio); }
      if (updates.languages !== undefined) { setClauses.push(`languages = $${idx++}`); values.push(updates.languages); }
      if (updates.religion !== undefined) { setClauses.push(`religion = $${idx++}`); values.push(updates.religion); }
      if (updates.age !== undefined) { setClauses.push(`age = $${idx++}`); values.push(updates.age); }

      // Pujas → update specialities TEXT[]
      if (req.body.pujas !== undefined) {
        const pujaNames = Array.isArray(req.body.pujas) ? req.body.pujas : [];
        setClauses.push(`specialities = $${idx++}`); values.push(pujaNames);
      }
      // Service cities → update cities TEXT[]
      if (req.body.serviceCities !== undefined) {
        const svcCities = Array.isArray(req.body.serviceCities) ? req.body.serviceCities : [];
        setClauses.push(`cities = $${idx++}`); values.push(svcCities);
      }

      setClauses.push(`"updatedAt" = $${idx++}`); values.push(new Date());

      if (setClauses.length === 1) {
        return res.status(400).json({ message: 'No fields to update' });
      }
      values.push(gurujiId);
      await pool.query(`UPDATE guruji_profiles SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);

      const updated = await storageInstance.getGurujiProfile(gurujiId);
      if (!updated) return res.status(404).json({ message: 'Guruji profile not found' });
      const user = await storageInstance.getUser(updated.userId);
      res.json({ ...updated, user: user || {} });
    } catch (error) {
      console.error('Error updating guruji profile:', error);
      res.status(500).json({ message: 'Failed to update guruji profile' });
    }
  });

  // Guruji: get their own profile
  app.get('/api/guruji/profile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const profile = await storageInstance.getGurujiProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });
      const user = await storageInstance.getUser(userId);
      const specializationValues = String(profile.specialization || '').split(',').map(value => value.trim()).filter(Boolean);
      const specializationIds = specializationValues.filter(value => /^\d+$/.test(value)).map(Number);
      const pujaRows = specializationIds.length
        ? (await pool.query('SELECT id,name FROM pujas WHERE id=ANY($1::int[])', [specializationIds])).rows
        : [];
      const namesById = new Map<string, string>(pujaRows.map((puja: any) => [String(puja.id), puja.name]));
      res.json({
        ...profile,
        city: user?.city || profile.city,
        specialization: specializationValues.map(value => namesById.get(value) || value).join(','),
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // Guruji self-edit: update their own profile (allowed when pending or rejected)
  app.put('/api/guruji/profile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const profile = await storageInstance.getGurujiProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: 'Guruji profile not found' });

      const { city, state, address, pincode, experience, pricePerHour, bio, languages, religion, age } = req.body;

      if (city !== undefined && city.trim().length < 2) {
        return res.status(400).json({ message: 'City must be at least 2 characters' });
      }
      if (experience !== undefined && (isNaN(Number(experience)) || Number(experience) < 1)) {
        return res.status(400).json({ message: 'Years of experience must be at least 1' });
      }

      const { pool } = await import('./db');
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (city !== undefined) { setClauses.push(`city = $${idx++}`); values.push(city.trim()); }
      if (state !== undefined) { setClauses.push(`state = $${idx++}`); values.push(state.trim()); }
      if (address !== undefined) { setClauses.push(`address = $${idx++}`); values.push(address.trim()); }
      if (pincode !== undefined) { setClauses.push(`pincode = $${idx++}`); values.push(pincode.trim()); }
      if (experience !== undefined) { setClauses.push(`experience = $${idx++}`); values.push(Number(experience)); }
      if (pricePerHour !== undefined) { setClauses.push(`"pricePerHour" = $${idx++}`); values.push(Number(pricePerHour)); }
      if (bio !== undefined) { setClauses.push(`description = $${idx++}`); values.push(bio.trim()); }
      if (languages !== undefined) { setClauses.push(`languages = $${idx++}`); values.push(Array.isArray(languages) ? languages : []); }
      if (religion !== undefined) { setClauses.push(`religion = $${idx++}`); values.push(religion); }
      if (age !== undefined) { setClauses.push(`age = $${idx++}`); values.push(Number(age)); }
      // Pujas → update specialities TEXT[]
      if (req.body.pujas !== undefined) {
        const pujaNames = Array.isArray(req.body.pujas) ? req.body.pujas : [];
        setClauses.push(`specialities = $${idx++}`); values.push(pujaNames);
      }
      // Service cities → update cities TEXT[]
      if (req.body.serviceCities !== undefined) {
        const svcCities = Array.isArray(req.body.serviceCities) ? req.body.serviceCities : [];
        setClauses.push(`cities = $${idx++}`); values.push(svcCities);
      }
      // Reset status to pending so admin reviews the updated profile
      setClauses.push(`status = $${idx++}`); values.push('pending');
      setClauses.push(`"updatedAt" = $${idx++}`); values.push(new Date());

      if (setClauses.length === 2) {
        return res.status(400).json({ message: 'No fields to update' });
      }
      values.push(profile.id);
      await pool.query(`UPDATE guruji_profiles SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
      if (city !== undefined) {
        await pool.query('UPDATE users SET city=$1 WHERE id=$2', [city.trim(), userId]);
      }

      const updated = await storageInstance.getGurujiProfile(profile.id);
      res.json(updated);
    } catch (error) {
      console.error('Error updating guruji profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

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
    let registrationClient: Awaited<ReturnType<typeof pool.connect>> | undefined;
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
        address,
        city,
        state,
        pincode,
        dob,
        photoUrl,
        // Guruji-specific fields (optional, only used when role === 'guruji')
        experience,
        specialization,
        location,
        languages,
        qualification,
      } = z.object({
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        email: z.string().trim().toLowerCase().email("Invalid email address"),
        mobile: z.string().trim().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
        age: z.number().int().min(18, "You must be at least 18 years old").max(120),
        gender: z.enum(["male", "female", "other"]),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["customer", "guruji"]),
        aadhar: z.string().optional(),
        caste: z.string().optional(),
        address: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        pincode: z.string().regex(/^$|^\d{6}$/, 'Pincode must contain six digits').optional(),
        dob: z.string().trim().min(1, 'Date of birth is required')
          .refine(value => validBookingDate(value) &&
            value <= new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date()), 'Invalid date of birth'),
        photoUrl: z.string().optional(),
        experience: z.number().optional(),
        specialization: z.string().optional(),
        location: z.string().optional(),
        languages: z.string().optional(),
        qualification: z.string().optional(),
      }).parse(req.body);
      const calculatedAge = ageFromDateOfBirth(dob);
      if (calculatedAge === null || calculatedAge < 18) {
        return res.status(400).json({ message: 'Registration requires a valid date of birth and age of at least 18' });
      }

      // Check if user already exists in database
      const existingUser = await storageInstance.getUserByMobile(mobile);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this mobile number" });
      }

      const existingEmail = await storageInstance.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "User already exists with this email" });
      }

      if (role === 'guruji') {
        const serviceCities = (location || '').split(',').map(s=>s.trim()).filter(Boolean);
        const servicePujas = (specialization || '').split(',').map(s=>Number(s.trim()));
        const [cities,pujas] = await Promise.all([storageInstance.getAllCities(),storageInstance.getAllPujas()]);
        if (!serviceCities.length || !servicePujas.length || !languages?.trim() || !experience || experience < 1
          || serviceCities.some(value=>!cities.some(c=>c.isActive && (String(c.id)===value || c.name===value)))
          || servicePujas.some(id=>!Number.isSafeInteger(id) || !pujas.some(p=>p.id===id && p.isActive))) {
          return res.status(400).json({message:'Select active service cities, pujas, languages and valid experience'});
        }
      }
      registrationClient = await pool.connect();
      await registrationClient.query('BEGIN');
      const registrationStorage = new DBStorage(registrationClient);
      // Account, profile and service links are committed together.
      const user = await registrationStorage.createUser({
        firstName,
        lastName,
        email,
        mobile,
        age: calculatedAge,
        gender,
        password,
        role,
        aadhar,
        caste,
        address,
        city,
        state,
        pincode,
        dob,
        photoUrl,
      } as any);

      // If user is guruji, create profile with all submitted details
      if (role === "guruji") {
        // `specialization` = comma-separated puja IDs (e.g. "1,2,3")
        // `location` = comma-separated city IDs (e.g. "5,7") — resolve to names
        // `languages` = comma-separated string (e.g. "Hindi, English")
        const rawCityIds = location
          ? location.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const languagesArray = languages
          ? languages.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        // Resolve city IDs → city names so DB queries can match by name
        let cityNames: string[] = rawCityIds;
        try {
          const allCities = await storageInstance.getAllCities();
          cityNames = rawCityIds.map(id => {
            const asNum = parseInt(id);
            if (!isNaN(asNum)) {
              const found = allCities.find(c => c.id === asNum);
              return found ? found.name : id;
            }
            return id; // already a name
          });
        } catch (e) {
          console.error("Could not resolve city IDs during registration:", e);
        }

        const gurujiProfile = await registrationStorage.createGurujiProfile({
          userId: user.id,
          bio: qualification ? `Qualification: ${qualification}` : "",
          experience: experience ?? 0,
          specialization: specialization || "",
          location: city || cityNames[0] || "",
          city: city || cityNames[0] || "",
          age: calculatedAge,
          cities: cityNames,
          address,
          state,
          pincode,
          profilePictureUrl: photoUrl || null,
          languages: languagesArray,
          radius: 10,
          isOnline: false,
          isOffline: true,
          isConsultation: false,
        } as any);

        // Populate guruji_pujas relationship table from specialization IDs
        if (specialization && gurujiProfile) {
          const pujaIds = specialization.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
          for (const pujaId of pujaIds) {
              await registrationClient.query(
                `INSERT INTO guruji_pujas ("gurujiId", "pujaId", "isAvailable", "createdAt", "updatedAt")
                 VALUES ($1, $2, true, NOW(), NOW())
                 ON CONFLICT DO NOTHING`,
                [gurujiProfile.id, pujaId]
              );
          }
        }
      }

      await registrationClient.query('COMMIT');
      // Set session
      await startUserSession(req, user);

      // Return user without password
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (registrationClient) await registrationClient.query('ROLLBACK').catch(() => {});
      console.error("Error registering user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      if ((error as any)?.code === '23505') return res.status(409).json({message: 'Email or mobile already registered'});
      if ((error as any)?.code === '23503') return res.status(400).json({message: 'A selected puja or service city is no longer available'});
      res.status(500).json({ message: "Failed to register user" });
    } finally {
      registrationClient?.release();
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

  // Update own user profile (basic info)
  app.put("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const targetId = parseInt(req.params.id);
      // Only allow users to update their own profile (unless admin)
      const sessionUser = await storageInstance.getUser(userId);
      if (userId !== targetId && (sessionUser as any)?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { firstName, lastName, age, address, city, state, pincode } = req.body;
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (firstName !== undefined) { setClauses.push(`"firstName" = $${idx++}`); values.push(firstName.trim()); }
      if (lastName !== undefined) { setClauses.push(`"lastName" = $${idx++}`); values.push(lastName.trim()); }
      if (age !== undefined) { setClauses.push(`age = $${idx++}`); values.push(Number(age)); }
      if (address !== undefined) { setClauses.push(`address = $${idx++}`); values.push(address); }
      if (city !== undefined) { setClauses.push(`city = $${idx++}`); values.push(city); }
      if (state !== undefined) { setClauses.push(`state = $${idx++}`); values.push(state); }
      if (pincode !== undefined) { setClauses.push(`pincode = $${idx++}`); values.push(pincode); }
      if (setClauses.length === 0) return res.status(400).json({ message: 'No fields to update' });
      values.push(targetId);
      const { pool } = await import('./db');
      await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
      const updated = await storageInstance.getUser(targetId);
      const { password, ...safeUser } = updated as any;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change own password
  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storageInstance.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const bcrypt = await import('bcrypt');
      const valid = await bcrypt.compare(currentPassword, (user as any).password);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
      const hashed = await bcrypt.hash(newPassword, 10);
      const { pool } = await import('./db');
      await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, userId]);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
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
  app.use('/api/pricing', publicPricingRouter);
  app.use('/api/admin/pricing', adminPricingRouter);
  app.use('/api/admin/pujas', adminPujaPriceRouter);
  app.get("/api/pujas", async (req: Request, res: Response) => {
    try {
      const pujas = await storageInstance.getAllPujas();
      if (req.query.includeInactive === 'true') {
        const user = req.session.userId
          ? (await pool.query('SELECT role,"isBlocked" FROM users WHERE id=$1', [req.session.userId])).rows[0] : null;
        if (!user || user.role !== 'admin' || user.isBlocked) return res.status(403).json({ message: 'Admin access required' });
        return res.json(pujas);
      }
      res.json(pujas.filter(p => p.isActive !== false));
    } catch (error) {
      console.error("Error fetching pujas:", error);
      res.status(500).json({ message: "Failed to fetch pujas" });
    }
  });
  
  // Create a new puja
  app.post("/api/pujas", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const parsedPuja = createPujaPayload.safeParse(req.body);
      if (!parsedPuja.success) return res.status(400).json({ message: parsedPuja.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
      const pujaData = parsedPuja.data;
      await validatePujaPriceRules(null, pujaData.price ?? pujaData.basePrice);
      console.log("Creating new puja:", pujaData);
      const newPuja = await storageInstance.createPuja(pujaData);
      console.log("Created puja:", newPuja);
      res.status(201).json(newPuja);
    } catch (error) {
      console.error("Error creating puja:", error);
      if ((error as any)?.status) return res.status((error as any).status).json({ message: (error as any).message });
      if (error instanceof ZodError) return res.status(400).json({ message: error.errors.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
      res.status(500).json({ message: "Failed to create puja" });
    }
  });
  
  // Update an existing puja
  app.put("/api/pujas/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid puja ID' });
      const parsedPuja = updatePujaPayload.safeParse(req.body);
      if (!parsedPuja.success) return res.status(400).json({ message: parsedPuja.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
      const pujaData = parsedPuja.data;
      if (pujaData.price !== undefined || pujaData.basePrice !== undefined) {
        const currentPuja = await storageInstance.getPuja(id);
        if (!currentPuja) return res.status(404).json({ message: 'Puja not found' });
        const price = pujaData.price !== undefined ? pujaData.price ?? pujaData.basePrice ?? currentPuja.basePrice
          : currentPuja.price ?? pujaData.basePrice ?? currentPuja.basePrice;
        await validatePujaPriceRules(id, price);
      }
      console.log("Updating puja:", id, pujaData);
      const updatedPuja = await storageInstance.updatePuja(id, pujaData);
      if (!updatedPuja) {
        return res.status(404).json({ message: "Puja not found" });
      }
      console.log("Updated puja:", updatedPuja);
      res.json(updatedPuja);
    } catch (error) {
      console.error("Error updating puja:", error);
      if ((error as any)?.status) return res.status((error as any).status).json({ message: (error as any).message });
      if (error instanceof ZodError) return res.status(400).json({ message: error.errors.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
      res.status(500).json({ message: "Failed to update puja" });
    }
  });
  
  // Delete a puja
  app.delete("/api/pujas/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
      
      if (!puja || (puja.isActive === false && !(req.session.userId &&
        (await pool.query('SELECT id FROM users WHERE id=$1 AND role=$2 AND "isBlocked"=false',
          [req.session.userId, 'admin'])).rows.length))) {
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

  // Helper: enrich bookings with puja name and guruji name
  async function enrichBookings(bookings: any[], customerView = false): Promise<any[]> {
    const pujaIds = [...new Set(bookings.map(b => b.pujaId).filter(Boolean))];
    const gurujiIds = [...new Set(bookings.map(b => b.gurujiId).filter(Boolean))];

    const [pujas, gurujiProfiles] = await Promise.all([
      Promise.all(pujaIds.map(id => storageInstance.getPuja(id))),
      Promise.all(gurujiIds.map(id => storageInstance.getGurujiProfile(id))),
    ]);

    const pujaMap = new Map(pujas.filter(Boolean).map((p: any) => [p!.id, p!.name]));
    
    const gurujiUserMap = new Map<number, string>();
    for (const gp of gurujiProfiles.filter(Boolean)) {
      const u = await storageInstance.getUser((gp as any).userId);
      if (u) gurujiUserMap.set((gp as any).id, customerView ? gurujiFirstName(u.firstName) : `${u.firstName} ${u.lastName}`.trim());
    }

    return bookings.map(b => ({
      ...b,
      ...(customerView ? {commissionSnapshot:undefined} : {}),
      pujaName: pujaMap.get(b.pujaId) || null,
      gurujiName: b.gurujiId ? (gurujiUserMap.get(b.gurujiId) || null) : null,
    }));
  }

  // Booking Routes
  app.post("/api/bookings", isAuthenticated, checkRole(['customer']), async (req: Request, res: Response) => {
    try {
      if ((await paymentSettings()).paymentRequired) {
        return res.status(402).json({ message: 'Complete verified Stripe checkout before sending this booking request.' });
      }

      const userId = req.session.userId as number;
      
      const bookingData = z.object({
        pujaId: z.number(),
        type: z.enum(["offline", "online"]),
        consultationType: z.enum(["own_guruji", "auto_select", "immediate"]).optional(),
        amount: z.number().positive(),
        withSamagri: z.boolean().default(false),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        time: z.string(),
        calendarDate: z.string().optional(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        }),
        duration: z.number().nonnegative().optional(),
        isImmediate: z.boolean().default(false),
        notes: z.string().optional(),
        gurujiId: z.number().optional(),
      }).parse(req.body);

      if (bookingData.type === 'offline') {
        if (!bookingData.address?.trim() || !bookingData.city?.trim()) {
          return res.status(400).json({ message: 'City and full address are required for an offline puja' });
        }
        if (!/^[1-9]\d{5}$/.test(bookingData.pincode?.trim() || '')) {
          return res.status(400).json({ message: 'A valid six-digit pincode is required for an offline puja' });
        }
        const cities = await storageInstance.getAllCities();
        const cityKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');
        if (!cities.some(city => city.isActive !== false && cityKey(city.name) === cityKey(bookingData.city!))) {
          return res.status(400).json({ message: 'This city is not currently available. Please select an active service city.' });
        }
      }

      const dateKey = bookingData.calendarDate || bookingData.date.slice(0, 10);
      if (!validBookingDate(dateKey) || parseBookingTime(bookingData.time) === null) {
        return res.status(400).json({ message: 'A valid booking date and time are required' });
      }
      const puja = await storageInstance.getPuja(bookingData.pujaId);
      if (!puja || puja.isActive === false) {
        return res.status(409).json({ message: 'This puja is no longer available. Please select an active puja.' });
      }
      if (!Number.isInteger(puja.duration) || puja.duration < 0 || puja.duration > 1440) {
        return res.status(400).json({ message: 'Puja duration is not configured' });
      }
      const date = new Date(`${dateKey}T12:00:00.000Z`);
      const pricingSnapshot = await getPricingQuote(pricingQuotePayload.parse({
        pujaId: bookingData.pujaId, calendarDate: dateKey, time: bookingData.time,
        withSamagri: bookingData.withSamagri,
      }));
      if (bookingData.amount !== pricingSnapshot.totalAmount) {
        return res.status(409).json({
          message: 'The puja price has changed. Review the current price and submit again.',
          quote: pricingSnapshot,
        });
      }
      const createBooking = () => storageInstance.createBooking({
        customerId: userId,
        ...bookingData,
        amount: pricingSnapshot.totalAmount,
        pricingSnapshot,
        duration: puja.duration,
        date,
        city: bookingData.city || '',
      } as any);
      let booking;

      // A selected Guruji still has to accept before the booking is confirmed.
      if (bookingData.gurujiId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(8157, $1)', [bookingData.gurujiId]);
          const matches = await storageInstance.getGurujisByFilters({
            city: bookingData.city, pujaId: bookingData.pujaId,
          });
          if (!matches.some(g => g.id === bookingData.gurujiId)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'This Guruji is no longer available for this puja or city' });
          }
          const busy = await getBusyGurujiIds([bookingData.gurujiId], dateKey, bookingData.time, puja.duration);
          if (busy.has(bookingData.gurujiId)) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'This Guruji is busy at the selected time. Please choose another Guruji or time.' });
          }
          booking = await createBooking();
          await storageInstance.createBookingRequest({
            bookingId: booking.id,
            gurujiId: bookingData.gurujiId,
            status: 'pending',
          });
          booking = await storageInstance.updateBookingStatus(booking.id, 'pending_approval');
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        const guruji = await storageInstance.getGurujiProfile(bookingData.gurujiId);
        if (guruji) {
          const customer = await storageInstance.getUser(userId);
          // Notify the chosen Guruji that they must accept or decline.
          await storageInstance.createNotification({
            userId: guruji.userId,
            title: 'New Booking Request',
            message: `${customer?.firstName || 'A customer'} requested your services for a puja in ${bookingData.city || 'your area'} on ${dateKey}. Please accept or decline.`,
            type: 'booking_request',
          });
          await storageInstance.createNotification({
            userId,
            title: 'Booking Request Sent',
            message: 'Your selected Guruji has been asked to accept the booking. It is not confirmed yet.',
            type: 'booking_update',
          });
        }
      } else {
        booking = await createBooking();
        // Auto-search mode — send request to all nearby gurujis, first to accept gets the booking
        await notifyGurujisPujaRequest(booking, bookingData.city || '');
      }

      if(!booking) throw new Error('Booking was not saved');
      const {commissionSnapshot: _internalCommission, ...customerBooking}=booking;
      res.status(201).json(customerBooking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: fromZodError(error),
        });
      }
      res.status((error as any)?.status || 500).json({ message: (error as any)?.status ? (error as any).message : "Failed to create booking" });
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
      
      const enriched = await enrichBookings(bookings, req.session.userRole === 'customer');
      res.json(enriched);
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

      const [enriched] = await enrichBookings([booking], req.session.userRole === 'customer');
      res.json(enriched);
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

  app.use('/api/bookings/:id/completion', isAuthenticated, bookingCompletionRouter);
  app.use('/api/admin/bookings/:id/communications', isAuthenticated, bookingCommunicationsRouter);

  app.put("/api/bookings/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({
        id: z.string().refine((val) => !isNaN(parseInt(val)), {
          message: "ID must be a number",
        }),
      }).parse(req.params);

      const { status } = z.object({
        status: z.enum(["in_progress", "completed"]),
      }).parse(req.body);

      const userId = req.session.userId as number;
      const userRole = req.session.userRole as string;

      if (!['admin', 'guruji'].includes(userRole)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (status === 'completed') {
        return res.status(409).json({ message: 'Completion requires the customer OTP. The Vaidik Dhara support team can manually complete a booking with a recorded reason.' });
      }
      const result = await changeBookingCompletion(parseInt(id), { id: userId, role: userRole }, 'start');
      if (result.status !== 200) return res.status(result.status).json(result.body);
      res.json(await storageInstance.getBooking(parseInt(id)));
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

  app.put("/api/bookings/:id/assign", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
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
      
      return res.status(409).json({ message: 'Send a booking request for the Guruji to accept instead of confirming it directly' });
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
      const [notifications, user] = await Promise.all([
        storageInstance.getNotifications(userId),
        storageInstance.getUser(userId),
      ]);
      
      res.json(notifications.map(notification => participantNotification(notification, user?.role)));
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

      const success = (await pool.query('UPDATE notifications SET "isRead"=true WHERE id=$1 AND "userId"=$2 RETURNING id',
        [parseInt(id), req.session.userId])).rowCount;
      
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

  app.put("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      await pool.query(`UPDATE notifications SET "isRead" = true WHERE "userId" = $1`, [userId]);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;
      await pool.query(`DELETE FROM notifications WHERE id = $1 AND "userId" = $2`, [id, userId]);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
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

  app.get("/api/admin/customers", isAuthenticated, checkRole(["admin"]), async (_req: Request, res: Response) => {
    try {
      const [allUsers, allBookings] = await Promise.all([
        storageInstance.getAllUsers(),
        storageInstance.getAllBookings(),
      ]);
      const bookingStats = new Map<number, { count: number; completed: number; latest: Date | null }>();
      for (const booking of allBookings) {
        const stats = bookingStats.get(booking.customerId) || { count: 0, completed: 0, latest: null };
        stats.count += 1;
        if (booking.status === 'completed') stats.completed += 1;
        const createdAt = new Date(booking.createdAt || booking.date);
        if (!stats.latest || createdAt > stats.latest) stats.latest = createdAt;
        bookingStats.set(booking.customerId, stats);
      }

      const customers = allUsers.filter(user => user.role === 'customer').map(user => {
        const missingFields = [
          ['age', 'Age'], ['gender', 'Gender'], ['address', 'Address'],
          ['city', 'City'], ['state', 'State'], ['pincode', 'Postal code'],
        ].filter(([field]) => !String((user as any)[field] ?? '').trim()).map(([, label]) => label);
        const stats = bookingStats.get(user.id);
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          age: user.age,
          gender: user.gender,
          address: (user as any).address || '',
          city: (user as any).city || '',
          state: (user as any).state || '',
          pincode: (user as any).pincode || '',
          isBlocked: user.isBlocked,
          createdAt: user.createdAt,
          missingFields,
          bookingCount: stats?.count || 0,
          completedBookings: stats?.completed || 0,
          latestBookingAt: stats?.latest,
        };
      });
      res.json(customers);
    } catch (error) {
      console.error('Error fetching admin customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  const customerProfileUpdateSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
    age: z.number().int().min(18).max(120),
    gender: z.enum(['male', 'female', 'other']),
    address: z.string().trim().max(300).nullable(),
    city: z.string().trim().max(100).nullable(),
    state: z.string().trim().max(100).nullable(),
    pincode: z.string().trim().max(20).nullable(),
  }).partial().strict().refine(data => Object.keys(data).length > 0, 'Provide at least one customer field');

  app.put("/api/admin/customers/:id", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const fields = customerProfileUpdateSchema.parse(req.body);
      const customer = await storageInstance.getUser(id);
      if (!customer || customer.role !== 'customer') {
        return res.status(404).json({ message: 'Customer not found' });
      }
      const updated = await storageInstance.updateUser(id, {
        ...fields,
        email: fields.email?.toLowerCase(),
      });
      if (!updated) return res.status(404).json({ message: 'Customer not found' });
      const { password: _password, ...safeCustomer } = updated;
      res.json(safeCustomer);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid customer information', errors: fromZodError(error) });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ message: 'That email address or mobile number is already in use' });
      }
      console.error('Error updating customer:', error);
      res.status(500).json({ message: 'Failed to update customer' });
    }
  });

  app.put("/api/admin/customers/:id/status", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const { isBlocked } = z.object({ isBlocked: z.boolean() }).parse(req.body);
      const customer = await storageInstance.getUser(id);
      if (!customer || customer.role !== 'customer') {
        return res.status(404).json({ message: 'Customer not found' });
      }
      const updated = await storageInstance.updateUser(id, { isBlocked });
      if (!updated) return res.status(404).json({ message: 'Customer not found' });
      res.json({ id: updated.id, isBlocked: updated.isBlocked });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid customer status', errors: fromZodError(error) });
      }
      console.error('Error updating customer status:', error);
      res.status(500).json({ message: 'Failed to update customer status' });
    }
  });

  app.post("/api/admin/customers/:id/remind", isAuthenticated, checkRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const customer = await storageInstance.getUser(id);
      if (!customer || customer.role !== 'customer') {
        return res.status(404).json({ message: 'Customer not found' });
      }
      const fields: Array<[keyof typeof customer, string]> = [
        ['age', 'Age'], ['gender', 'Gender'], ['address', 'Address'],
        ['city', 'City'], ['state', 'State'], ['pincode', 'Postal code'],
      ];
      const missing = fields.filter(([field]) => !String(customer[field] ?? '').trim()).map(([, label]) => label);
      if (missing.length === 0) {
        return res.status(409).json({ message: 'This customer profile has no missing details' });
      }
      await storageInstance.createNotification({
        userId: customer.id,
        title: 'Please complete your profile',
        message: `Please add the following missing details to your profile: ${missing.join(', ')}.`,
        type: 'profile_reminder',
      });
      res.json({ message: 'In-app reminder sent', missingFields: missing });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid customer ID', errors: fromZodError(error) });
      }
      console.error('Error sending customer profile reminder:', error);
      res.status(500).json({ message: 'Failed to send customer reminder' });
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

  // Legacy payment routes accepted self-reported "paid" status; keep them disabled
  // until a verified gateway integration replaces them.
  
  // Register chatbot routes
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api', journeyRoutes);
  app.use('/api/admin/pujas', isAuthenticated, isAdmin, pujaRoutes);
  app.use('/api/demo', (_req, res) => res.status(410).json({message: 'Demo access has been removed. Please use a registered account.'}));
  
  // ── Payment Settings (public read, admin write) ──────────────────────────
  app.get('/api/settings/payment', async (req: Request, res: Response) => {
    try {
      res.json(await paymentSettings());
    } catch (err) {
      console.error('Error fetching payment settings:', err);
      res.status(500).json({ message: 'Could not load payment settings' });
    }
  });

  app.put('/api/admin/settings/payment', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      res.json(await savePaymentSettings(req.body));
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : (err as any).status || 500).json({
        message:err instanceof ZodError ? 'Enter a valid advance percentage (1–100) and HTTPS QR image URL.' : (err as any).status ? (err as Error).message : 'Failed to update payment settings',
      });
    }
  });

  const paidBookingEligible = (booking: any) => eligiblePujaRequestGurujis(booking,booking.city||'');
  const paidBookingBroadcast = (booking: any, gurujis: any[]) => {
    for (const g of gurujis) io.to(`user_${g.userId}`).emit('newPujaRequest',{
      bookingId:booking.id,title:'New Puja Request',message:`New puja request in ${booking.city||'your area'}`,
      amount:booking.amount,date:booking.date,city:booking.city,pincode:booking.pincode,timestamp:new Date(),
    });
  };
  app.post('/api/payments/checkout',isAuthenticated,checkRole(['customer']),async(req,res)=>{
    try {
      return res.json(await startCheckout(req.session.userId!,req.body,
        checkoutReturnOrigin(req.get('origin')||`https://${req.hostname}`)));
    } catch(error:any) {
      return res.status(error instanceof ZodError?400:error.status||503).json({message:
        error instanceof ZodError?'Complete the booking details before paying.':error.status?error.message:
          'Stripe could not open checkout. No booking request was sent. Please retry or contact the Vaidik Dhara support team.'});
    }
  });
  app.get('/api/payments/checkout/:sessionId',isAuthenticated,checkRole(['customer']),async(req,res)=>{
    try {
      res.json(await checkoutResult(req.session.userId!,req.params.sessionId,paidBookingEligible,paidBookingBroadcast));
    } catch(error:any) { res.status(error.status||503).json({message:error.status?error.message:'Payment verification is temporarily unavailable. Do not pay again; retry verification.'}); }
  });
  app.get('/api/payments/orders/:id',isAuthenticated,checkRole(['customer']),async(req,res)=>{
    try {
    if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({message:'Invalid payment attempt'});
    const order=(await pool.query(`SELECT stripe_session_id AS "sessionId",booking_id AS "bookingId",state
      FROM portal_checkout_orders WHERE id=$1 AND customer_id=$2`,[req.params.id,req.session.userId])).rows[0];
    if (!order) return res.status(404).json({message:'Payment attempt not found'});
    return res.json(order);
    } catch { return res.status(503).json({message:'Payment attempt could not be loaded'}); }
  });
  app.get('/api/admin/payments/checkouts',isAuthenticated,isAdmin,async(_req,res)=>{
    try {
    res.json((await pool.query(`SELECT o.id,o.customer_id AS "customerId",u."firstName" AS "customerName",
      o.booking_id AS "bookingId",o.state,o.needs_support AS "needsSupport",(o.advance_paise/100.0)::float8 AS "advanceAmount",
      o.advance_percentage::float8 AS "advancePercentage",(o.pricing_snapshot->>'totalAmount')::float8 AS "totalAmount",
      o.created_at AS "createdAt",o.livemode,o.stripe_payment_intent_id AS "paymentReference",
      o.stripe_session_id AS "sessionId"
      FROM portal_checkout_orders o JOIN users u ON u.id=o.customer_id ORDER BY o.created_at DESC LIMIT 100`)).rows);
    } catch { res.status(503).json({message:'Checkout history could not be loaded'}); }
  });
  app.post('/api/admin/payments/checkouts/:id/reconcile',isAuthenticated,isAdmin,async(req,res)=>{
    try {
      if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({message:'Invalid payment attempt'});
      const order=(await pool.query('SELECT customer_id,stripe_session_id FROM portal_checkout_orders WHERE id=$1',[req.params.id])).rows[0];
      if (!order?.stripe_session_id) return res.status(404).json({message:'Checkout session not found'});
      return res.json(await checkoutResult(order.customer_id,order.stripe_session_id,paidBookingEligible,paidBookingBroadcast));
    } catch(error:any) { return res.status(error.status||503).json({message:error.status?error.message:'Stripe verification is unavailable. No new charge was made.'}); }
  });
  app.post('/api/stripe/webhook',async(req,res)=>{
    const signature=req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) return res.status(400).json({message:'A Stripe signature is required'});
    try {
      await processPaymentWebhook(req.body,signature,paidBookingEligible,paidBookingBroadcast);
      return res.json({received:true});
    } catch(error:any) {
      return res.status(error.type==='StripeSignatureVerificationError'?400:500).json({message:'Payment webhook verification or processing failed'});
    }
  });

  // Register booking request routes
  app.post('/api/bookings/:id/send-requests', isAuthenticated, checkRole(['customer']), sendBookingRequests);
  app.post('/api/booking-requests/:id/respond', isAuthenticated, checkRole(['guruji']), respondToBookingRequest);
  app.get('/api/guruji/booking-requests', isAuthenticated, checkRole(['guruji']), getGurujiBookingRequests);

  // Shared policy for customer requests, Guruji withdrawal, and admin decisions.
  app.use(cancellationsRouter);
  app.use(refundsRouter);
  app.use(customerFinanceRouter);
  app.use(commissionsRouter);
  app.use(gurujiFinanceRouter);
  startGurujiFinanceScheduler();

  // ── Booking Queries (customer ↔ admin messages per booking) ─────────────

  // POST /api/bookings/:id/query — customer asks a question to admin
  app.post('/api/bookings/:id/query', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const bookingId = parseInt(req.params.id);
      const { message } = req.body;
      if (!message || !String(message).trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const booking = await storageInstance.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.customerId !== userId) {
        return res.status(403).json({ message: 'You can only ask queries on your own bookings' });
      }

      const r = await pool.query(
        `INSERT INTO booking_queries (booking_id, customer_id, message, status)
         VALUES ($1, $2, $3, 'open') RETURNING *`,
        [bookingId, userId, String(message).trim()]
      );

      // Notify all admins
      try {
        const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
        for (const a of admins.rows) {
          await storageInstance.createNotification({
            userId: a.id,
            title: 'New Customer Query',
            message: `Customer query on booking #${bookingId}: ${String(message).slice(0, 80)}`,
            type: 'query',
          });
        }
      } catch (e) { /* ignore notification errors */ }

      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      console.error('Error creating query:', e);
      res.status(500).json({ message: e.message || 'Failed to create query' });
    }
  });

  // GET /api/bookings/:id/queries — list queries for a booking (customer or admin)
  app.get('/api/bookings/:id/queries', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const bookingId = parseInt(req.params.id);
      const user = await storageInstance.getUser(userId);
      const booking = await storageInstance.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (user?.role !== 'admin' && booking.customerId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const r = await pool.query(
        `SELECT * FROM booking_queries WHERE booking_id = $1 ORDER BY created_at DESC`,
        [bookingId]
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET /api/admin/queries — admin lists all queries
  // GET /api/admin/pending-bookings — bookings awaiting guruji acceptance
  app.get('/api/admin/pending-bookings', isAuthenticated, checkRole(['admin']), async (req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT 
          b.id,
          b.status,
          b.date,
          b.time,
          b.city,
          b.address,
          b."totalAmount" AS amount,
          b."createdAt",
          p.name AS puja_name,
          cu."firstName" || ' ' || cu."lastName" AS customer_name,
          cu.mobile AS customer_mobile,
          (SELECT COUNT(*) FROM booking_requests br WHERE br."bookingId" = b.id AND br.status = 'pending') AS pending_requests,
          (SELECT COUNT(*) FROM booking_requests br WHERE br."bookingId" = b.id AND br.status = 'declined') AS declined_requests,
          (SELECT COUNT(*) FROM booking_requests br WHERE br."bookingId" = b.id) AS total_requests
        FROM bookings b
        LEFT JOIN pujas p ON p.id = b."pujaId"
        LEFT JOIN users cu ON cu.id = b."customerId"
        WHERE b.status IN ('pending', 'pending_approval')
        ORDER BY b."createdAt" DESC
      `);
      res.json(r.rows);
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
      res.status(500).json({ message: 'Failed to fetch pending bookings' });
    }
  });

  app.get('/api/admin/queries', isAuthenticated, checkRole(['admin']), async (req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT q.*,
               u."firstName" || ' ' || u."lastName" AS customer_name,
               u.mobile AS customer_mobile,
               b.date AS booking_date,
               b.city AS booking_city,
               p.name AS puja_name
        FROM booking_queries q
        LEFT JOIN users u ON u.id = q.customer_id
        LEFT JOIN bookings b ON b.id = q.booking_id
        LEFT JOIN pujas p ON p.id = b."pujaId"
        ORDER BY q.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      console.error('Error listing queries:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // POST /api/admin/queries/:id/reply — admin replies to a query
  app.post('/api/admin/queries/:id/reply', isAuthenticated, checkRole(['admin']), async (req: Request, res: Response) => {
    try {
      const adminId = req.session.userId!;
      const queryId = parseInt(req.params.id);
      const { reply } = req.body;
      if (!reply || !String(reply).trim()) {
        return res.status(400).json({ message: 'Reply is required' });
      }
      const r = await pool.query(
        `UPDATE booking_queries
         SET admin_reply = $1, replied_by = $2, replied_at = NOW(), status = 'answered'
         WHERE id = $3 RETURNING *`,
        [String(reply).trim(), adminId, queryId]
      );
      if (r.rowCount === 0) return res.status(404).json({ message: 'Query not found' });

      // Notify customer
      const q = r.rows[0];
      try {
        await storageInstance.createNotification({
          userId: q.customer_id,
          title: 'Vaidik Dhara support team replied to your query',
          message: `Reply on booking #${q.booking_id}: ${String(reply).slice(0, 80)}`,
          type: 'query_reply',
        });
      } catch (e) { /* ignore */ }

      res.json(q);
    } catch (e: any) {
      console.error('Error replying to query:', e);
      res.status(500).json({ message: e.message || 'Failed to reply' });
    }
  });

  // Public endpoint — get cancellation rules for display
  app.get('/api/cancellation-rules', async (req, res) => {
    try {
      const { userType } = req.query;
      const q = userType
        ? `SELECT * FROM cancellation_rules WHERE user_type = $1 AND is_active = true ORDER BY hours_threshold DESC`
        : `SELECT * FROM cancellation_rules WHERE is_active = true ORDER BY user_type, hours_threshold DESC`;
      const r = await pool.query(q, userType ? [userType] : []);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize Socket.io
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  io.engine.use(sessionMiddleware);
  io.use(async (socket,next) => {
    try {
      const user = await storageInstance.getUser((socket.request as any).session?.userId || 0);
      if (!user || user.isBlocked || isSampleAccount(user.email)) return next(new Error('Login required'));
      socket.data.userId = user.id;
      socket.data.userRole = user.role;
      next();
    } catch {
      next(new Error('Unable to verify login'));
    }
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
  async function eligiblePujaRequestGurujis(booking: any, city: string) {
    const nearbyGurujis = await storageInstance.getNearbyGurujis(city, booking.pujaId, 20, booking.pincode);
    const puja = await storageInstance.getPuja(booking.pujaId);
    const busyGurujiIds = await getBusyGurujiIds(
      nearbyGurujis.map(g => g.id),
      booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : String(booking.date).slice(0, 10),
      booking.time,
      booking.duration ?? puja?.duration ?? 0,
    );
    return nearbyGurujis.filter(g =>
      g.aadharVerified && g.documentsVerified && !busyGurujiIds.has(g.id));
  }

  async function notifyGurujisPujaRequest(booking: any, city: string) {
    try {
      console.log(`🔔 AUTO-SEARCH: booking #${booking.id}, city="${city}", pujaId=${booking.pujaId}, pincode=${booking.pincode}`);
      
      const verifiedGurujis = await eligiblePujaRequestGurujis(booking, city);
      const { notifyAdminsOfUnassignedBooking } = await import('./unassignedBookingAlerts');
      await notifyAdminsOfUnassignedBooking(booking, verifiedGurujis.length, storageInstance);
      
      console.log(`✓ Found ${verifiedGurujis.length} verified gurujis near ${city}`);

      if (verifiedGurujis.length > 0) {
        // Update booking status to pending_approval
        await storageInstance.updateBookingStatus(booking.id, 'pending_approval');

        // Notify customer that their request was sent out
        await storageInstance.createNotification({
          userId: booking.customerId,
          title: '📋 Booking Request Sent',
          message: `Your puja booking request has been sent to ${verifiedGurujis.length} available Guruji${verifiedGurujis.length > 1 ? 's' : ''} in ${city}. You will be notified once a Guruji accepts.`,
          type: 'booking_update',
        });

        for (const guruji of verifiedGurujis) {
          // Create booking request for each guruji
          await (storageInstance as any).createBookingRequest({
            bookingId: booking.id,
            gurujiId: guruji.id,
            status: 'pending',
          });
          console.log(`📨 Booking request created for guruji ${guruji.id} (userId=${guruji.userId})`);

          // In-app notification
          await storageInstance.createNotification({
            userId: guruji.userId,
            title: '🔔 New Puja Request',
            message: `New puja request in ${city} for ${new Date(booking.date).toLocaleDateString()}. Tap to accept or decline.`,
            type: 'booking_request',
          });

          // Emit Socket.IO notification directly to guruji's room
          io.to(`user_${guruji.userId}`).emit('newPujaRequest', {
            bookingId: booking.id,
            title: '🔔 New Puja Request',
            message: `New puja request in ${city}`,
            amount: booking.amount,
            date: booking.date,
            city: city,
            pincode: booking.pincode,
            timestamp: new Date()
          });
        }
      } else {
        await storageInstance.createNotification({
          userId: booking.customerId,
          title: 'Searching for a Guruji',
          message: `No eligible Guruji is currently available for your puja in ${city}. The Vaidik Dhara support team has been alerted to help with your unassigned request.`,
          type: 'booking_update',
        });
      }
    } catch (error) {
      console.error('Error in notifyGurujisPujaRequest:', error);
      throw error;
    }
  }

  // API endpoint for gurujis to accept/reject booking requests  
  app.post("/api/bookings/:bookingId/respond", isAuthenticated, checkRole(['guruji']), async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const { action } = req.body; // 'accept' or 'reject'
      
      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'reject'" });
      }
      
      const guruji = await storageInstance.getGurujiProfileByUserId(req.session.userId!);
      const requests = await storageInstance.getBookingRequestsByBookingId(bookingId);
      const request = requests.find((request: any) => request.gurujiId === guruji?.id && request.status === 'pending');
      if (!request) return res.status(404).json({ message: 'No open booking request belongs to this Guruji' });
      // Use the same persistence and ownership checks as the main acceptance flow.
      req.params.id = String(request.id);
      req.body = { response: action === 'accept' ? 'accept' : 'decline', message: req.body.message };
      await respondToBookingRequest(req, res);
    } catch (error) {
      console.error("Error responding to booking:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });
  
  // The video conference API routes are already defined above

  // ── Review / Rating Routes ───────────────────────────────────────────────

  // POST /api/reviews – submit a rating (customer→guruji or guruji→customer)
  app.post('/api/reviews', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { bookingId, gurujiId, rating, review, fromRole } = z.object({
        bookingId: z.coerce.number().int().positive(),
        gurujiId: z.coerce.number().int().positive().optional(),
        rating: z.number().int().min(1).max(5),
        review: z.string().trim().max(500).nullable().optional(),
        fromRole: z.enum(['customer', 'guruji']).optional(),
      }).parse(req.body);
      const user = await storageInstance.getUser(userId);
      const role = user?.role;
      if (role !== 'customer' && role !== 'guruji') return res.status(403).json({ message: 'Only booking participants can submit ratings' });
      if (fromRole && fromRole !== role) return res.status(403).json({ message: 'You cannot rate on behalf of the other participant' });
      const booking = await storageInstance.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.status !== 'completed') {
        return res.status(400).json({ message: 'You can only rate completed bookings' });
      }
      if (!booking.gurujiId || (gurujiId !== undefined && gurujiId !== booking.gurujiId)) return res.status(400).json({ message: 'Rating must be for the Guruji assigned to this booking' });

      if (role === 'guruji') {
        // Guruji rating a customer — verify the guruji owns this booking
        // Check booking assignment via guruji profile
        const gurujiProfile = await pool.query(
          `SELECT id FROM guruji_profiles WHERE "userId" = $1 LIMIT 1`, [userId]
        );
        if (gurujiProfile.rows.length === 0 || booking.gurujiId !== gurujiProfile.rows[0].id) {
          return res.status(403).json({ message: 'You are not assigned to this booking' });
        }
        // Prevent duplicate guruji review
        const existing = await storageInstance.getReviewByBookingAndRole(bookingId, 'guruji');
        if (existing) return res.status(409).json({ message: 'You have already rated this customer' });
      } else {
        // Customer rating a guruji
        if (booking.customerId !== userId) return res.status(403).json({ message: 'Forbidden' });
        const existing = await storageInstance.getReviewByBookingId(bookingId);
        if (existing) return res.status(409).json({ message: 'You have already rated this booking' });
      }

      const created = await storageInstance.createReview({
        bookingId,
        customerId: booking.customerId,
        gurujiId: booking.gurujiId,
        rating,
        review: review || null,
        fromRole: role,
      });

      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors.map(issue => issue.message).join('; ') });
      if ((error as any)?.code === 'REVIEW_EXISTS') return res.status(409).json({ message: 'You have already submitted this rating' });
      if ((error as any)?.code === 'REVIEW_BOOKING_INVALID') return res.status(400).json({ message: 'You can only rate your completed booking' });
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  const canReadBookingRatings = async (bookingId: number, userId: number) => {
    const result = await pool.query(
      `SELECT b.id FROM bookings b JOIN users u ON u.id=$2
       LEFT JOIN guruji_profiles gp ON gp.id=b."gurujiId"
       WHERE b.id=$1 AND (u.role='admin' OR (u.role='customer' AND b."customerId"=u.id)
         OR (u.role='guruji' AND gp."userId"=u.id))`, [bookingId, userId]);
    return result.rows.length > 0;
  };
  // GET /api/reviews/booking/:bookingId – check if customer review exists for a booking
  app.get('/api/reviews/booking/:bookingId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookingId = z.coerce.number().int().positive().parse(req.params.bookingId);
      if (!await canReadBookingRatings(bookingId, req.session.userId!)) return res.status(403).json({ message: 'Forbidden' });
      const review = await storageInstance.getReviewByBookingId(bookingId);
      res.json(review || null);
    } catch (error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ message: 'Failed to fetch review' });
    }
  });

  // GET /api/reviews/booking/:bookingId/both – get both customer and guruji reviews for a booking
  app.get('/api/reviews/booking/:bookingId/both', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookingId = z.coerce.number().int().positive().parse(req.params.bookingId);
      if (!await canReadBookingRatings(bookingId, req.session.userId!)) return res.status(403).json({ message: 'Forbidden' });
      const [customerReview, gurujiReview] = await Promise.all([
        storageInstance.getReviewByBookingAndRole(bookingId, 'customer'),
        storageInstance.getReviewByBookingAndRole(bookingId, 'guruji'),
      ]);
      res.json({ customerReview: customerReview || null, gurujiReview: gurujiReview || null });
    } catch (error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ message: 'Failed to fetch reviews' });
    }
  });

  // GET /api/reviews/guruji/:gurujiId – public list of customer reviews for a guruji
  app.get('/api/reviews/guruji/:gurujiId', async (req: Request, res: Response) => {
    try {
      const gurujiId = parseInt(req.params.gurujiId);
      const reviews = await storageInstance.getReviewsByGurujiId(gurujiId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  // GET /api/reviews/my-customer-ratings – customer sees ratings given to them by gurujis
  app.get('/api/reviews/my-customer-ratings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const ratings = await storageInstance.getReviewsByCustomerId(userId);
      res.json(ratings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch customer ratings' });
    }
  });

  // GET /api/admin/ratings – admin analytics for all ratings
  app.get('/api/admin/ratings', isAdmin, async (req: Request, res: Response) => {
    try {
      // Guruji ratings summary (customer→guruji reviews)
      const gurujiRatings = await pool.query(`
        SELECT
          gp.id AS guruji_id,
          u."firstName" || ' ' || u."lastName" AS guruji_name,
          array_to_string(gp.specialities, ', ') AS specialization,
          COUNT(r.id)::int AS total_reviews,
          ROUND(AVG(r.rating)::numeric, 2)::float AS avg_rating,
          SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END)::int AS five_star,
          SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END)::int AS four_star,
          SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END)::int AS three_star,
          SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END)::int AS low_star
        FROM guruji_profiles gp
        JOIN users u ON u.id = gp."userId"
        LEFT JOIN reviews r ON r."gurujiId" = gp.id AND r.from_role = 'customer'
        GROUP BY gp.id, u."firstName", u."lastName", gp.specialities
        ORDER BY avg_rating DESC NULLS LAST, total_reviews DESC
      `);

      // Customer ratings summary (guruji→customer reviews)
      const customerRatings = await pool.query(`
        SELECT
          cu.id AS customer_id,
          cu."firstName" || ' ' || cu."lastName" AS customer_name,
          COUNT(r.id)::int AS total_ratings,
          ROUND(AVG(r.rating)::numeric, 2)::float AS avg_rating
        FROM users cu
        LEFT JOIN reviews r ON r."customerId" = cu.id AND r.from_role = 'guruji'
        WHERE cu.role = 'customer'
        GROUP BY cu.id, cu."firstName", cu."lastName"
        HAVING COUNT(r.id) > 0
        ORDER BY avg_rating DESC
      `);

      // Rating distribution for gurujis (customer→guruji)
      const distribution = await pool.query(`
        SELECT rating, COUNT(*)::int AS count
        FROM reviews WHERE from_role = 'customer'
        GROUP BY rating ORDER BY rating DESC
      `);

      // Distribution for customer ratings (guruji→customer)
      const customerDistribution = await pool.query(`
        SELECT rating, COUNT(*)::int AS count
        FROM reviews WHERE from_role = 'guruji'
        GROUP BY rating ORDER BY rating DESC
      `);

      // Recent guruji reviews (customer→guruji)
      const recentGurujiReviews = await pool.query(`
        SELECT r.id, r."bookingId", r.rating, r.comment AS review, r."createdAt",
               cu."firstName" || ' ' || cu."lastName" AS customer_name,
               gu."firstName" || ' ' || gu."lastName" AS guruji_name,
               p.name AS puja_name
        FROM reviews r
        JOIN users cu ON cu.id = r."customerId"
        JOIN guruji_profiles gp ON gp.id = r."gurujiId"
        JOIN users gu ON gu.id = gp."userId"
        LEFT JOIN bookings b ON b.id = r."bookingId"
        LEFT JOIN pujas p ON p.id = b."pujaId"
        WHERE r.from_role = 'customer'
        ORDER BY r."createdAt" DESC LIMIT 10
      `);

      // Recent customer ratings (guruji→customer)
      const recentCustomerRatings = await pool.query(`
        SELECT r.id, r."bookingId", r.rating, r.comment AS review, r."createdAt",
               cu."firstName" || ' ' || cu."lastName" AS customer_name,
               gu."firstName" || ' ' || gu."lastName" AS guruji_name
        FROM reviews r
        JOIN users cu ON cu.id = r."customerId"
        JOIN guruji_profiles gp ON gp.id = r."gurujiId"
        JOIN users gu ON gu.id = gp."userId"
        WHERE r.from_role = 'guruji'
        ORDER BY r."createdAt" DESC LIMIT 10
      `);

      // Totals
      const totals = await pool.query(`
        SELECT
          COUNT(CASE WHEN from_role = 'customer' THEN 1 END)::int AS guruji_review_count,
          COUNT(CASE WHEN from_role = 'guruji' THEN 1 END)::int AS customer_rating_count,
          ROUND(AVG(CASE WHEN from_role = 'customer' THEN rating END)::numeric, 2)::float AS avg_guruji_rating,
          ROUND(AVG(CASE WHEN from_role = 'guruji' THEN rating END)::numeric, 2)::float AS avg_customer_rating
        FROM reviews
      `);

      res.json({
        totals: totals.rows[0],
        gurujiRatings: gurujiRatings.rows,
        customerRatings: customerRatings.rows,
        gurujiDistribution: distribution.rows,
        customerDistribution: customerDistribution.rows,
        recentGurujiReviews: recentGurujiReviews.rows,
        recentCustomerRatings: recentCustomerRatings.rows,
      });
    } catch (error) {
      console.error('Error fetching admin ratings:', error);
      res.status(500).json({ message: 'Failed to fetch ratings analytics' });
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
      if (!user || isSampleAccount(user.email)) return res.status(401).json({ message: 'Invalid credentials' });
      if (user.role !== 'sales_rep' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Not a sales representative.' });
      }
      if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });

      const isValid = await storageInstance.verifyPassword(user.id, password);
      if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

      await startUserSession(req, user);

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Sales rep login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  const isSalesRep = checkRole(['sales_rep', 'admin']);

  // GET /api/sales-rep/stats – platform metrics for sales pitch dashboard
  app.get('/api/sales-rep/stats', isAuthenticated, isSalesRep, async (req: Request, res: Response) => {
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [total, monthly, gurujis, customers, cities, completed] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM bookings`),
        pool.query(`SELECT COUNT(*) as total FROM bookings WHERE "createdAt" >= $1`, [startOfMonth]),
        pool.query(`SELECT COUNT(*) as total FROM guruji_profiles WHERE status = 'approved'`),
        pool.query(`SELECT COUNT(*) as total FROM users WHERE role = 'customer'`),
        pool.query(`SELECT COUNT(DISTINCT c) as total FROM guruji_profiles gp, unnest(COALESCE(gp.cities, ARRAY[]::text[])) c WHERE cardinality(gp.cities) > 0`),
        pool.query(`SELECT COUNT(*) as total FROM bookings WHERE status = 'completed'`),
      ]);
      res.json({
        totalBookings: parseInt(total.rows[0].total),
        thisMonthBookings: parseInt(monthly.rows[0].total),
        totalGurujis: parseInt(gurujis.rows[0].total),
        totalCustomers: parseInt(customers.rows[0].total),
        citiesCovered: parseInt(cities.rows[0].total),
        completedBookings: parseInt(completed.rows[0].total),
      });
    } catch (error) {
      console.error('Sales stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

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
  const registrationStaffAccess = (req: Request, res: Response, next: NextFunction) => {
    const role = req.session.userRole;
    if (req.path.startsWith('/api/admin/') ? role !== 'admin' : !['admin', 'sales_rep'].includes(role || '')) {
      return res.status(403).json({message: 'Forbidden'});
    }
    next();
  };
  app.post(['/api/sales-rep/register-customer', '/api/admin/register-customer'], isAuthenticated, registrationStaffAccess, validateStaffRegistration, async (req: Request, res: Response) => {
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
      if ((error as any)?.code === '23505') return res.status(409).json({message: 'Email or mobile already registered'});
      res.status(500).json({ message: 'Failed to register customer' });
    }
  });

  // POST /api/sales-rep/register-guruji – sales rep registers a new guruji with KYC + profile
  app.post(['/api/sales-rep/register-guruji', '/api/admin/register-guruji'], isAuthenticated, registrationStaffAccess, validateStaffRegistration, async (req: Request, res: Response) => {
    let registrationClient: Awaited<ReturnType<typeof pool.connect>> | undefined;
    try {
      const salesRepId = req.session.userId!;
      const {
        firstName, lastName, email, mobile, password,
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

      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({message: 'A password of at least six characters is required'});
      }
      registrationClient = await pool.connect();
      await registrationClient.query('BEGIN');
      const registrationStorage = new DBStorage(registrationClient);
      // Use the password entered by staff, never the publicly known phone number.
      const user = await registrationStorage.createUser({
        firstName, lastName, email, mobile, password,
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
      const specialities = await resolvePujaNames(Array.isArray(pujas) ? pujas : []);
      const gurujiProfile = await registrationStorage.createGurujiProfile({
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
        // Keep service-city choices separate from the user's residential address.
        cities: Array.isArray(cities) ? cities.map(String) : [],
        city: city || location || null,
        state: state || null,
        pincode: pincode || null,
        address: address || null,
        // KYC fields
        age: age ? parseInt(age) : null,
        religion: religion || null,
        videoUrl: videoUrl || null,
      } as any);

      for (const pujaId of (Array.isArray(pujas) ? pujas : []).map(Number)) {
        await registrationClient.query(
          `INSERT INTO guruji_pujas ("gurujiId","pujaId","isAvailable","createdAt","updatedAt")
           VALUES ($1,$2,true,NOW(),NOW()) ON CONFLICT DO NOTHING`, [gurujiProfile.id, pujaId],
        );
      }
      await registrationClient.query('COMMIT');
      const { password: _, ...safeUser } = user;
      res.status(201).json({ user: safeUser, profile: gurujiProfile });
    } catch (error) {
      if (registrationClient) await registrationClient.query('ROLLBACK').catch(() => {});
      console.error('Error registering guruji:', error);
      if ((error as any)?.code === '23505') return res.status(409).json({message: 'Email or mobile already registered'});
      if ((error as any)?.code === '23503') return res.status(400).json({message: 'A selected puja is no longer available'});
      res.status(500).json({ message: 'Failed to register guruji' });
    } finally {
      registrationClient?.release();
    }
  });

  // Return the server instance
  return httpServer;
}
