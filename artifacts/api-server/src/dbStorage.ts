import { 
  type User, type InsertUser, 
  type Otp, type InsertOtp,
  type Puja, type InsertPuja,
  type GurujiProfile, type InsertGurujiProfile,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment,
  type Review, type InsertReview,
  type Notification, type InsertNotification,
  type ChatbotTemplate, type InsertChatbotTemplate,
  type ChatbotTrainingData, type InsertChatbotTrainingData,
  type WhatsappUser, type InsertWhatsappUser,
  type WhatsappConversation, type InsertWhatsappConversation,
  type WhatsappMessage, type InsertWhatsappMessage,
  type UserJourney, type InsertUserJourney,
  type UserJourneyItem, type InsertUserJourneyItem
} from "@shared/schema";
import { pool } from './db';
import { getBookingCommission } from './pujaCommission';
import { getUnavailableGurujiIds } from './gurujiAvailability';
import { hash, compare } from 'bcrypt';
import { IStorage } from './storage';
import { isUnassignedBooking } from '@workspace/portal-shared/isUnassignedBooking';
import { resolveUnassignedBookingAlerts } from './unassignedBookingAlerts';

/**
 * PostgreSQL implementation of the Storage interface using direct SQL queries
 * This bypasses Drizzle ORM to work directly with the database schema
 */
export class DBStorage implements IStorage {
  constructor(private readonly registrationConnection?: {query: (...args: any[]) => Promise<any>}) {}
  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    
    const result = await pool.query(
      `SELECT * FROM users WHERE LOWER(TRIM(email)) = $1`,
      [email.trim().toLowerCase()]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async getUserByMobile(mobile: string): Promise<User | undefined> {
    if (!mobile) return undefined;
    
    const result = await pool.query(
      `SELECT * FROM users WHERE mobile = $1 OR
        (length(regexp_replace(COALESCE(mobile,''),'[^0-9]','','g'))>=10
          AND right(regexp_replace(mobile,'[^0-9]','','g'),10)=$2)
        ORDER BY (mobile=$1) DESC,id LIMIT 1`,
      [mobile, mobile.replace(/\D/g, '').slice(-10)]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Hash password if provided
    let hashedPassword = null;
    if (userData.password) {
      hashedPassword = await hash(userData.password, 10);
    }
    
    const result = await (this.registrationConnection ?? pool).query(
      `INSERT INTO users (
        "firstName", "lastName", email, mobile, password, 
        role, "isVerified", "isBlocked", "createdAt", "updatedAt",
        gender, age, dob, aadhar, caste, photo_url, registered_by,
        address, city, state, pincode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.mobile,
        hashedPassword,
        userData.role || 'customer',
        false,
        false,
        new Date(),
        new Date(),
        userData.gender || null,
        (userData as any).age || null,
        (userData as any).dob || null,
        (userData as any).aadhar || null,
        (userData as any).caste || null,
        (userData as any).photoUrl || null,
        (userData as any).registeredBy || null,
        (userData as any).address || null,
        (userData as any).city || null,
        (userData as any).state || null,
        (userData as any).pincode || null,
      ]
    );
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    // Hash new password if provided
    if (userData.password) {
      userData.password = await hash(userData.password, 10);
    }
    
    // Build SQL for updating only the fields that were provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (userData.firstName !== undefined) {
      updateFields.push(`"firstName" = $${paramIndex++}`);
      values.push(userData.firstName);
    }
    
    if (userData.lastName !== undefined) {
      updateFields.push(`"lastName" = $${paramIndex++}`);
      values.push(userData.lastName);
    }
    
    if (userData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(userData.email);
    }
    
    if (userData.mobile !== undefined) {
      updateFields.push(`mobile = $${paramIndex++}`);
      values.push(userData.mobile);
    }
    
    if (userData.password !== undefined) {
      updateFields.push(`password = $${paramIndex++}`);
      values.push(userData.password);
    }
    
    if (userData.age !== undefined) {
      updateFields.push(`age = $${paramIndex++}`);
      values.push(userData.age);
    }
    
    if (userData.gender !== undefined) {
      updateFields.push(`gender = $${paramIndex++}`);
      values.push(userData.gender);
    }

    if (userData.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      values.push(userData.address);
    }

    if (userData.city !== undefined) {
      updateFields.push(`city = $${paramIndex++}`);
      values.push(userData.city);
    }

    if (userData.state !== undefined) {
      updateFields.push(`state = $${paramIndex++}`);
      values.push(userData.state);
    }

    if (userData.pincode !== undefined) {
      updateFields.push(`pincode = $${paramIndex++}`);
      values.push(userData.pincode);
    }
    
    if (userData.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(userData.role);
    }
    
    if (userData.aadhar !== undefined) {
      updateFields.push(`aadhar = $${paramIndex++}`);
      values.push(userData.aadhar);
    }
    
    if (userData.caste !== undefined) {
      updateFields.push(`caste = $${paramIndex++}`);
      values.push(userData.caste);
    }
    
    if (userData.isVerified !== undefined) {
      updateFields.push(`"isVerified" = $${paramIndex++}`);
      values.push(userData.isVerified);
    }
    
    if (userData.isBlocked !== undefined) {
      updateFields.push(`"isBlocked" = $${paramIndex++}`);
      values.push(userData.isBlocked);
    }
    
    // Always update the updatedAt field
    updateFields.push(`"updatedAt" = $${paramIndex++}`);
    values.push(new Date());
    
    // Add the user ID to the WHERE clause
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async blockUser(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET "isBlocked" = true, "updatedAt" = $1 WHERE id = $2`,
      [new Date(), id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }
  
  async unblockUser(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET "isBlocked" = false, "updatedAt" = $1 WHERE id = $2`,
      [new Date(), id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }
  
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT email, password FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) return false;
    
    // Special handling for default admin account during development
    if (result.rows[0].email === "admin@admin.com" && password === "admin123") {
      return true;
    }
    
    if (!result.rows[0].password) return false;
    
    return compare(password, result.rows[0].password);
  }
  
  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hash(newPassword, 10);
    
    const result = await pool.query(
      `UPDATE users SET password = $1, "updatedAt" = $2 WHERE id = $3`,
      [hashedPassword, new Date(), userId]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  // OTP Management
  async createOtp(otpData: InsertOtp): Promise<Otp> {
    // First delete any existing OTPs for this mobile
    await pool.query(
      `DELETE FROM otps WHERE mobile = `,
      [otpData.mobile]
    );
    
    // Then insert the new OTP
    const result = await pool.query(
      `INSERT INTO otps (mobile, otp, expires_at, created_at)
       VALUES (, , , )
       RETURNING *`,
      [
        otpData.mobile,
        otpData.otp,
        otpData.expiresAt,
        new Date()
      ]
    );
    
    return this.mapOtpFromDb(result.rows[0]);
  }
  
  async getOtpByMobile(mobile: string): Promise<Otp | undefined> {
    const result = await pool.query(
      `SELECT * FROM otps WHERE mobile = `,
      [mobile]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapOtpFromDb(result.rows[0]);
  }
  
  async verifyOtp(mobile: string, otpValue: string): Promise<boolean> {
    const otpRecord = await this.getOtpByMobile(mobile);
    if (!otpRecord) return false;
    
    // Check if OTP matches and is not expired
    const isExpired = new Date() > otpRecord.expiresAt;
    return otpRecord.otp === otpValue && !isExpired;
  }
  
  async deleteOtp(mobile: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM otps WHERE mobile = `,
      [mobile]
    );
    
    return result.rowCount > 0;
  }

  // Puja Management
  async getPuja(id: number): Promise<Puja | undefined> {
    const result = await pool.query(
      `SELECT * FROM pujas WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapPujaFromDb(result.rows[0]);
  }
  
  async getAllPujas(): Promise<Puja[]> {
    const result = await pool.query(`SELECT * FROM pujas`);
    
    return result.rows.map(row => this.mapPujaFromDb(row));
  }
  
  async createPuja(pujaData: InsertPuja): Promise<Puja> {
    const result = await pool.query(
      `INSERT INTO pujas (
        name, description, "basePrice", type, duration, items, 
        "imageUrl", "isPopular", "isActive", price, "createdAt", "updatedAt", samagri
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        pujaData.name,
        pujaData.description,
        pujaData.basePrice,
        pujaData.type,
        pujaData.duration,
        pujaData.items || null,
        pujaData.imageUrl || null,
        pujaData.isPopular ?? false,
        pujaData.isActive ?? true,
        pujaData.price ?? pujaData.basePrice,
        new Date(),
        new Date(),
        JSON.stringify((pujaData as any).samagri ?? [])
      ]
    );
    
    return this.mapPujaFromDb(result.rows[0]);
  }
  
  async updatePuja(id: number, pujaData: Partial<Puja>): Promise<Puja | undefined> {
    const puja = await this.getPuja(id);
    if (!puja) return undefined;
    
    // Build SQL for updating only the fields that were provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (pujaData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(pujaData.name);
    }
    
    if (pujaData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(pujaData.description);
    }
    
    if (pujaData.basePrice !== undefined) {
      updateFields.push(`"basePrice" = $${paramIndex++}`);
      values.push(pujaData.basePrice);
    }
    
    if (pujaData.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(pujaData.type);
    }
    
    if (pujaData.duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      values.push(pujaData.duration);
    }
    
    if (pujaData.items !== undefined) {
      updateFields.push(`items = $${paramIndex++}`);
      values.push(pujaData.items);
    }
    if ((pujaData as any).samagri !== undefined) {
      updateFields.push(`samagri = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify((pujaData as any).samagri));
    }
    
    if (pujaData.imageUrl !== undefined) {
      updateFields.push(`"imageUrl" = $${paramIndex++}`);
      values.push(pujaData.imageUrl);
    }
    
    if (pujaData.isPopular !== undefined) {
      updateFields.push(`"isPopular" = $${paramIndex++}`);
      values.push(pujaData.isPopular);
    }
    
    if (pujaData.isActive !== undefined) {
      updateFields.push(`"isActive" = $${paramIndex++}`);
      values.push(pujaData.isActive);
    }
    
    if (pujaData.price !== undefined) {
      updateFields.push(`price = $${paramIndex++}`);
      values.push(pujaData.price);
    }
    
    // Always update the updatedAt field
    updateFields.push(`"updatedAt" = $${paramIndex++}`);
    values.push(new Date());
    
    // Add the puja ID to the WHERE clause
    values.push(id);
    
    const result = await pool.query(
      `UPDATE pujas SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return this.mapPujaFromDb(result.rows[0]);
  }
  
  async deletePuja(id: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await pool.query(
      `UPDATE pujas SET "isActive" = false, "updatedAt" = $1 WHERE id = $2`,
      [new Date(), id]
    );
    
    return result.rowCount! > 0;
  }
  
  async searchPujas(query: string): Promise<Puja[]> {
    const result = await pool.query(
      `SELECT * FROM pujas 
       WHERE name ILIKE $1 AND "isActive" = true`,
      [`%${query}%`]
    );
    
    return result.rows.map(row => this.mapPujaFromDb(row));
  }

  // Guruji Profile Management
  async getGurujiProfile(id: number): Promise<GurujiProfile | undefined> {
    const result = await pool.query(
      `SELECT * FROM guruji_profiles WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async getGurujiProfileByUserId(userId: number): Promise<GurujiProfile | undefined> {
    const result = await pool.query(
      `SELECT * FROM guruji_profiles WHERE "userId" = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async createGurujiProfile(profileData: InsertGurujiProfile): Promise<GurujiProfile> {
    const pd = profileData as any;
    const specialitiesArray = pd.specialization 
      ? (typeof pd.specialization === 'string' ? pd.specialization.split(',').map((s: string) => s.trim()) : pd.specialization)
      : [];

    // Build cities array: prefer explicit cities field, else derive from city string
    const citiesArr: string[] = Array.isArray(pd.cities) && pd.cities.length > 0
      ? pd.cities
      : (pd.city ? [pd.city] : []);

    const result = await (this.registrationConnection ?? pool).query(
      `INSERT INTO guruji_profiles (
        "userId", description, city, address, state, pincode, experience, "pricePerHour",
        "isVerified", "isAvailable", languages, specialities, rating, "totalReviews",
        aadhar_verified, documents_verified, certificates, profile_picture_url, status,
        religion, age, video_url, cities, "createdAt", "updatedAt",
        "isOnline","isOffline","isConsultation"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        profileData.userId,
        profileData.bio || pd.description || null,
        pd.city || '',
        pd.address || profileData.location || null,
        pd.state || null,
        pd.pincode || null,
        profileData.experience || 0,
        profileData.pricePerHour ?? pd.price_per_hour ?? 500,
        pd.isVerified ?? false,
        pd.isAvailable ?? false,
        profileData.languages || [],
        specialitiesArray,
        pd.rating || 0,
        pd.totalReviews || 0,
        pd.aadharVerified ?? false,
        pd.documentsVerified ?? false,
        profileData.certificates || (pd.certificate ? [pd.certificate] : []),
        profileData.profilePictureUrl || pd.profile_picture_url || null,
        pd.status || 'pending',
        pd.religion || null,
        pd.age || null,
        pd.videoUrl || pd.video_url || null,
        citiesArr,
        new Date(),
        new Date(),
        pd.isOnline ?? false,
        pd.isOffline ?? true,
        pd.isConsultation ?? false,
      ]
    );
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async updateGurujiProfile(id: number, profileData: Partial<GurujiProfile>): Promise<GurujiProfile | undefined> {
    const profile = await this.getGurujiProfile(id);
    if (!profile) return undefined;
    
    // Build SQL for updating only the fields that were provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (profileData.bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      values.push(profileData.bio);
    }
    
    if (profileData.experience !== undefined) {
      updateFields.push(`experience = $${paramIndex++}`);
      values.push(profileData.experience);
    }
    
    if (profileData.specialization !== undefined) {
      updateFields.push(`specialization = $${paramIndex++}`);
      values.push(profileData.specialization);
    }
    
    if (profileData.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(profileData.location);
    }
    
    if (profileData.radius !== undefined) {
      updateFields.push(`radius = $${paramIndex++}`);
      values.push(profileData.radius);
    }
    
    if (profileData.languages !== undefined) {
      updateFields.push(`languages = $${paramIndex++}`);
      values.push(profileData.languages);
    }
    
    if (profileData.availability !== undefined) {
      updateFields.push(`availability = $${paramIndex++}`);
      values.push(profileData.availability);
    }
    
    if (profileData.certificate !== undefined) {
      updateFields.push(`certificate = $${paramIndex++}`);
      values.push(profileData.certificate);
    }
    
    if (profileData.imageUrl !== undefined) {
      updateFields.push(`"imageUrl" = $${paramIndex++}`);
      values.push(profileData.imageUrl);
    }
    
    if (profileData.isConsultation !== undefined) {
      updateFields.push(`"isConsultation" = $${paramIndex++}`);
      values.push(profileData.isConsultation);
    }
    
    if (profileData.isAvailable !== undefined) {
      updateFields.push(`"isAvailable" = $${paramIndex++}`);
      values.push(profileData.isAvailable);
    }
    
    if (profileData.rating !== undefined) {
      updateFields.push(`rating = $${paramIndex++}`);
      values.push(profileData.rating);
    }
    
    if (profileData.totalReviews !== undefined) {
      updateFields.push(`"totalReviews" = $${paramIndex++}`);
      values.push(profileData.totalReviews);
    }
    
    // Always update the updatedAt field
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    
    // Add the profile ID to the WHERE clause
    values.push(id);
    
    const result = await pool.query(
      `UPDATE guruji_profiles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async getNearbyGurujis(city: string, pujaId?: number, radius: number = 10, pincode?: string): Promise<GurujiProfile[]> {
    if (!city.trim() && !pincode?.trim()) return [];
    let params: any[] = [];
    let pujaFilter = '';

    if (pujaId) {
      params.push(pujaId);
      pujaFilter = `AND (
        EXISTS (
          SELECT 1 FROM guruji_pujas gpu
          WHERE gpu."gurujiId" = gp.id AND gpu."pujaId" = $${params.length}
        )
        OR EXISTS (
          SELECT 1 FROM pujas p JOIN unnest(gp.specialities) s
            ON LOWER(TRIM(s)) = LOWER(p.name) OR TRIM(s) = p.id::text
          WHERE p.id = $${params.length}
        )
      )`;
    }

    if (pincode && !city.trim()) {
      // Without a service city, only the exact pincode is safe to match.
      // With a city, search ALL eligible Gurujis serving it below.
      params.push(pincode);
      const exactResult = await pool.query(
        `SELECT gp.* FROM guruji_profiles gp
         JOIN users u ON gp."userId" = u.id
         WHERE gp."isVerified" = true AND gp."isAvailable" = true
            AND gp.status = 'approved'
           AND u."isBlocked" = false
           AND gp.pincode = $${params.length}
           ${pujaFilter}
         ORDER BY gp.rating DESC`,
        params
      );
      
      if (exactResult.rows.length > 0) {
        return exactResult.rows.map(row => this.mapGurujiProfileFromDb(row));
      }
      // The city fallback does not use the pincode parameter.
      params.pop();
    }

    // A pincode match must not cut off other eligible Gurujis in the service city.
    if (!city.trim()) return [];
    params.push(city.trim().toLowerCase().replace(/[\s_-]+/g, ' '));
    const cityResult = await pool.query(
      `SELECT gp.* FROM guruji_profiles gp
       JOIN users u ON gp."userId" = u.id
       WHERE gp."isVerified" = true AND gp."isAvailable" = true
          AND gp.status = 'approved'
         AND u."isBlocked" = false
         AND (
            REGEXP_REPLACE(LOWER(TRIM(gp.city)), '[[:space:]_-]+', ' ', 'g') = $${params.length}
           OR EXISTS (
              SELECT 1 FROM unnest(gp.cities) c
              WHERE REGEXP_REPLACE(LOWER(TRIM(c)), '[[:space:]_-]+', ' ', 'g') = $${params.length}
           )
         )
         ${pujaFilter}
       ORDER BY gp.rating DESC`,
      params
    );
    
    return cityResult.rows.map(row => this.mapGurujiProfileFromDb(row));
  }

  // Guruji Approval Management
  async approveGuruji(id: number, approvedBy: number): Promise<GurujiProfile | undefined> {
    const result = await pool.query(
      `UPDATE guruji_profiles 
       SET status = 'approved', aadhar_verified = true, documents_verified = true,
           "isAvailable" = true, "isVerified" = true, "updatedAt" = $1
       WHERE id = $2 RETURNING *`,
      [new Date(), id]
    );
    if (result.rows.length === 0) return undefined;
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }

  async rejectGuruji(id: number, reason: string): Promise<GurujiProfile | undefined> {
    const result = await pool.query(
      `UPDATE guruji_profiles 
       SET status = 'rejected', "isAvailable" = false, "isVerified" = false, "updatedAt" = $1
       WHERE id = $2 RETURNING *`,
      [new Date(), id]
    );
    if (result.rows.length === 0) return undefined;
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }

  // Booking Management
  async getBooking(id: number): Promise<Booking | undefined> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE "customerId" = $1 ORDER BY "createdAt" DESC`,
      [customerId]
    );
    
    return result.rows.map(row => this.mapBookingFromDb(row));
  }
  
  async getBookingsByGurujiId(gurujiId: number): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE "gurujiId" = $1 ORDER BY "createdAt" DESC`,
      [gurujiId]
    );
    
    return result.rows.map(row => this.mapBookingFromDb(row));
  }
  
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const commissionSnapshot=await getBookingCommission(bookingData.pujaId??null,Number(bookingData.amount));
    const result = await pool.query(
      `INSERT INTO bookings (
        "customerId", "pujaId", "gurujiId", address, city, state, pincode,
        date, time, "locationType", "totalAmount", "consultationType",
        notes, status, "createdAt", "updatedAt", duration, pricing_snapshot, commission_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        bookingData.customerId,
        bookingData.pujaId || null,
        bookingData.gurujiId || null,
        bookingData.address || null,
        bookingData.city || null,
        (bookingData as any).state || null,
        (bookingData as any).pincode || null,
        bookingData.date,
        (bookingData as any).time || null,
        bookingData.type || 'offline',
        bookingData.amount,
        bookingData.consultationType || 'own_guruji',
        bookingData.notes || null,
        bookingData.status || 'pending',
        new Date(),
        new Date(),
        bookingData.duration,
        bookingData.pricingSnapshot || null,
        commissionSnapshot
      ]
    );
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'pending_approval'): Promise<Booking | undefined> {
    const result = await pool.query(
      `UPDATE bookings SET status = $1::booking_status, "updatedAt" = $2 WHERE id = $3 RETURNING *`,
      [status, new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    if (!isUnassignedBooking(result.rows[0])) await resolveUnassignedBookingAlerts(id);
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined> {
    const result = await pool.query(
      `UPDATE bookings SET "gurujiId" = $1, status = 'confirmed', "updatedAt" = $2 
       WHERE id = $3 RETURNING *`,
      [gurujiId, new Date(), bookingId]
    );
    
    if (result.rows.length === 0) return undefined;
    await resolveUnassignedBookingAlerts(bookingId);
    return this.mapBookingFromDb(result.rows[0]);
  }

  // Booking Requests
  async createBookingRequest(data: { bookingId: number; gurujiId: number; status?: string }): Promise<any> {
    const result = await pool.query(
      `INSERT INTO booking_requests ("bookingId", "gurujiId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.bookingId, data.gurujiId, data.status || 'pending', new Date(), new Date()]
    );
    return result.rows[0];
  }

  async getBookingRequest(id: number): Promise<any | undefined> {
    const result = await pool.query(
      `SELECT * FROM booking_requests WHERE id = $1`,
      [id]
    );
    return result.rows[0] || undefined;
  }

  async getBookingRequestsByBookingId(bookingId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM booking_requests WHERE "bookingId" = $1 ORDER BY "createdAt" DESC`,
      [bookingId]
    );
    return result.rows;
  }

  async getBookingRequestsByGurujiId(gurujiId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM booking_requests WHERE "gurujiId" = $1 ORDER BY "createdAt" DESC`,
      [gurujiId]
    );
    return result.rows;
  }

  async updateBookingRequestStatus(id: number, status: string, message?: string): Promise<any | undefined> {
    const result = await pool.query(
      `UPDATE booking_requests SET status = $1, message = $2, "updatedAt" = $3 WHERE id = $4 RETURNING *`,
      [status, message || null, new Date(), id]
    );
    return result.rows[0] || undefined;
  }

  async expireOtherBookingRequests(bookingId: number, acceptedRequestId: number): Promise<void> {
    await pool.query(
      `UPDATE booking_requests SET status = 'expired', "updatedAt" = $1 
       WHERE "bookingId" = $2 AND id != $3 AND status = 'pending'`,
      [new Date(), bookingId, acceptedRequestId]
    );
  }

  // Payment Management
  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapPaymentFromDb(result.rows[0]);
  }
  
  async getPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
    const result = await pool.query(
      `SELECT * FROM payments WHERE "bookingId" = $1 ORDER BY "createdAt" DESC`,
      [bookingId]
    );
    
    return result.rows.map(row => this.mapPaymentFromDb(row));
  }
  
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const result = await pool.query(
      `INSERT INTO payments (
        booking_id, amount, status, transaction_id, payment_method,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        paymentData.bookingId,
        paymentData.amount,
        paymentData.status || 'unpaid',
        paymentData.transactionId || null,
        paymentData.paymentMethod || null,
        new Date(),
        new Date()
      ]
    );
    
    return this.mapPaymentFromDb(result.rows[0]);
  }
  
  async updatePaymentStatus(id: number, status: 'unpaid' | 'partial' | 'paid' | 'refunded'): Promise<Payment | undefined> {
    const result = await pool.query(
      `UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [status, new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapPaymentFromDb(result.rows[0]);
  }

  // Review Management
  async getReview(id: number): Promise<Review | undefined> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapReviewFromDb(result.rows[0]);
  }
  
  async getReviewsByGurujiId(gurujiId: number): Promise<Review[]> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE "gurujiId" = $1 AND from_role = 'customer' ORDER BY "createdAt" DESC`,
      [gurujiId]
    );
    
    return result.rows.map(row => this.mapReviewFromDb(row));
  }
  
  async createReview(reviewData: InsertReview): Promise<Review> {
    const fromRole = reviewData.fromRole || 'customer';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize submissions per booking so concurrent clicks cannot create duplicates.
      const booking = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [reviewData.bookingId])).rows[0];
      if (!booking || booking.status !== 'completed' || booking.customerId !== reviewData.customerId || booking.gurujiId !== reviewData.gurujiId) {
        throw Object.assign(new Error('You can only rate your completed booking'), { code: 'REVIEW_BOOKING_INVALID' });
      }
      const existing = await client.query(`SELECT id FROM reviews WHERE "bookingId"=$1 AND from_role=$2`, [reviewData.bookingId, fromRole]);
      if (existing.rows.length) throw Object.assign(new Error('You have already submitted this rating'), { code: 'REVIEW_EXISTS' });
      // Serialize customer ratings across different bookings for the same Guruji too.
      if (fromRole === 'customer') await client.query('SELECT id FROM guruji_profiles WHERE id=$1 FOR UPDATE', [reviewData.gurujiId]);
      const result = await client.query(
        `INSERT INTO reviews ("customerId","gurujiId","bookingId",from_role,rating,comment,"createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
        [reviewData.customerId, reviewData.gurujiId, reviewData.bookingId, fromRole, reviewData.rating, reviewData.review || null],
      );
      if (fromRole === 'customer') await client.query(
        `UPDATE guruji_profiles SET rating=stats.average,"totalReviews"=stats.count,"updatedAt"=NOW()
         FROM (SELECT COALESCE(AVG(rating),0) AS average,COUNT(*)::int AS count FROM reviews
           WHERE "gurujiId"=$1 AND from_role='customer') stats WHERE guruji_profiles.id=$1`, [reviewData.gurujiId]);
      await client.query('COMMIT');
      return this.mapReviewFromDb(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReviewsByCustomerId(customerId: number): Promise<Review[]> {
    const result = await pool.query(
      `SELECT r.*, u."firstName" || ' ' || u."lastName" AS guruji_name,
              b."pujaId", p.name AS puja_name
       FROM reviews r
       LEFT JOIN guruji_profiles gp ON gp.id = r."gurujiId"
       LEFT JOIN users u ON u.id = gp."userId"
       LEFT JOIN bookings b ON b.id = r."bookingId"
       LEFT JOIN pujas p ON p.id = b."pujaId"
       WHERE r."customerId" = $1 AND r.from_role = 'guruji'
       ORDER BY r."createdAt" DESC`,
      [customerId]
    );
    return result.rows.map(row => ({ ...this.mapReviewFromDb(row), gurujiName: row.guruji_name, pujaName: row.puja_name } as any));
  }

  async getReviewByBookingAndRole(bookingId: number, fromRole: string): Promise<Review | undefined> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE "bookingId" = $1 AND from_role = $2 LIMIT 1`,
      [bookingId, fromRole]
    );
    if (result.rows.length === 0) return undefined;
    return this.mapReviewFromDb(result.rows[0]);
  }
  
  // Helper method to update guruji rating after a new review
  private async updateGurujiRating(gurujiId: number): Promise<void> {
    const result = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews
       WHERE "gurujiId" = $1 AND from_role = 'customer'`,
      [gurujiId]
    );
    
    if (result.rows.length > 0) {
      const { avg_rating, count } = result.rows[0];
      
      await pool.query(
        `UPDATE guruji_profiles
         SET rating = $1, "totalReviews" = $2, "updatedAt" = $3
         WHERE id = $4`,
        [parseFloat(avg_rating) || 0, parseInt(count) || 0, new Date(), gurujiId]
      );
    }
  }

  // Notification Management
  async getNotifications(userId: number): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE "userId" = $1
       ORDER BY "isRead" ASC, "createdAt" DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapNotificationFromDb(row));
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (
        "userId", title, message, type, "isRead", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        (notificationData as any).type || 'general',
        false,
        new Date()
      ]
    );
    
    return this.mapNotificationFromDb(result.rows[0]);
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Content Management
  async getContent(key: string): Promise<any | undefined> {
    const result = await pool.query(
      `SELECT * FROM contents WHERE key = $1`,
      [key]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return result.rows[0];
  }
  
  async updateContent(key: string, title: string, content: string): Promise<any | undefined> {
    // Check if content exists
    const existingContent = await this.getContent(key);
    
    if (existingContent) {
      // Update existing content
      const result = await pool.query(
        `UPDATE contents SET title = $1, content = $2 WHERE key = $3 RETURNING *`,
        [title, content, key]
      );
      
      return result.rows[0];
    } else {
      // Create new content
      const result = await pool.query(
        `INSERT INTO contents (key, title, content) VALUES ($1, $2, $3) RETURNING *`,
        [key, title, content]
      );
      
      return result.rows[0];
    }
  }

  // Mapping functions to convert DB rows to entity objects
  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      firstName: row.firstName || row.first_name || '',
      lastName: row.lastName || row.last_name || '',
      email: row.email,
      mobile: row.mobile,
      password: row.password,
      age: row.age || 0,
      gender: row.gender || null,
      role: row.role,
      aadhar: row.aadhar || null,
      dob: row.dob instanceof Date
        ? `${row.dob.getFullYear()}-${String(row.dob.getMonth() + 1).padStart(2, '0')}-${String(row.dob.getDate()).padStart(2, '0')}`
        : row.dob ? String(row.dob).slice(0, 10) : null,
      caste: row.caste || null,
      photoUrl: row.photo_url || row.profileImage || null,
      registeredBy: row.registered_by || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      isVerified: row.isVerified ?? row.is_verified ?? false,
      isBlocked: row.isBlocked ?? row.is_blocked ?? false,
      createdAt: row.createdAt || row.created_at || new Date(),
      updatedAt: row.updatedAt || row.updated_at || new Date(),
    };
  }
  
  private mapOtpFromDb(row: any): Otp {
    return {
      id: row.id,
      mobile: row.mobile,
      otp: row.otp,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }
  
  private mapPujaFromDb(row: any): Puja {
    return {
      samagri: row.samagri ?? [],
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: row.basePrice,
      type: row.type,
      duration: row.duration,
      price: row.price,
      imageUrl: row.imageUrl,
      items: row.items,
      isPopular: row.isPopular,
      isActive: row.isActive,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at
    };
  }
  
  private mapGurujiProfileFromDb(row: any): GurujiProfile {
    return {
      id: row.id,
      userId: row.userId,
      bio: row.description || row.bio || null,
      experience: row.experience,
      specialization: Array.isArray(row.specialities) ? row.specialities.join(',') : (row.specialization || null),
      location: row.address || row.city || null,
      radius: row.radius || 10,
      languages: row.languages || [],
      pricePerHour: row.pricePerHour || row.price_per_hour || 0,
      isOnline: row.isOnline ?? row.is_online ?? false,
      isOffline: row.isOffline ?? row.is_offline ?? true,
      isConsultation: row.isConsultation ?? row.is_consultation ?? false,
      isAvailable: row.isAvailable ?? row.is_available ?? false,
      aadharVerified: row.aadhar_verified || false,
      documentsVerified: row.documents_verified || false,
      verificationDate: row.verification_date || null,
      rating: row.rating || 0,
      totalReviews: row.totalReviews || row.total_reviews || 0,
      certificates: row.certificates || [],
      profilePictureUrl: row.profile_picture_url || null,
      city: row.city || null,
      address: row.address || null,
      state: row.state || null,
      pincode: row.pincode || null,
      religion: row.religion || null,
      age: row.age || null,
      videoUrl: row.video_url || null,
      status: row.status || 'pending',
      cities: Array.isArray(row.cities) ? row.cities : [],
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };
  }
  
  private mapBookingFromDb(row: any): Booking {
    return {
      id: row.id,
      customerId: row.customerId || row.customer_id,
      gurujiId: row.gurujiId || row.guruji_id || null,
      pujaId: row.pujaId || row.puja_id,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      date: row.date,
      time: row.time || null,
      status: row.status,
      type: row.locationType || row.type || 'offline',
      duration: row.duration ?? null,
      amount: row.totalAmount || row.amount || 0,
      consultationType: row.consultationType || row.consultation_type || null,
      isImmediate: row.isImmediate || row.is_immediate || false,
      notes: row.notes || null,
      pricingSnapshot: row.pricing_snapshot ?? null,
      commissionSnapshot: row.commission_snapshot ?? null,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };
  }
  
  private mapPaymentFromDb(row: any): Payment {
    return {
      id: row.id,
      bookingId: row.bookingId ?? row.booking_id,
      amount: Number(row.amount),
      status: row.status,
      transactionId: row.transactionId ?? row.transaction_id,
      paymentMethod: row.method ?? row.payment_method,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at
    };
  }
  
  private mapReviewFromDb(row: any): Review {
    return {
      id: row.id,
      customerId: row.customerId || row.customer_id,
      gurujiId: row.gurujiId || row.guruji_id,
      bookingId: row.bookingId || row.booking_id,
      fromRole: row.fromRole || row.from_role || 'customer',
      rating: row.rating,
      review: row.comment || row.review || null,
      createdAt: row.createdAt || row.created_at,
    } as any;
  }
  
  private mapNotificationFromDb(row: any): Notification {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      message: row.message,
      type: row.type || 'general',
      isRead: row.isRead || row.is_read || false,
      createdAt: row.createdAt || row.created_at,
    };
  }

  // Chatbot Template Management
  async getChatbotTemplates(): Promise<ChatbotTemplate[]> {
    const result = await pool.query(`SELECT * FROM chatbot_templates`);
    return result.rows.map(row => this.mapChatbotTemplateFromDb(row));
  }
  
  async createChatbotTemplate(templateData: InsertChatbotTemplate): Promise<ChatbotTemplate> {
    const result = await pool.query(
      `INSERT INTO chatbot_templates (
        name, content, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        templateData.name,
        templateData.content,
        true, // is_active
        new Date(),
        new Date()
      ]
    );
    
    return this.mapChatbotTemplateFromDb(result.rows[0]);
  }
  
  async updateChatbotTemplate(id: number, templateData: Partial<ChatbotTemplate>): Promise<ChatbotTemplate | undefined> {
    // Build SQL for updating only the fields that were provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (templateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(templateData.name);
    }
    
    if (templateData.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      values.push(templateData.content);
    }
    
    if (templateData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(templateData.isActive);
    }
    
    // Always update the updatedAt field
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    
    // Add the template ID to the WHERE clause
    values.push(id);
    
    if (updateFields.length === 0) return undefined;
    
    const result = await pool.query(
      `UPDATE chatbot_templates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapChatbotTemplateFromDb(result.rows[0]);
  }
  
  async deleteChatbotTemplate(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM chatbot_templates WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  // ChatBot Training Data Management
  async getChatbotTrainingData(): Promise<ChatbotTrainingData[]> {
    const result = await pool.query(`SELECT * FROM chatbot_training_data`);
    return result.rows.map(row => this.mapChatbotTrainingDataFromDb(row));
  }
  
  async createChatbotTrainingData(data: InsertChatbotTrainingData): Promise<ChatbotTrainingData> {
    const result = await pool.query(
      `INSERT INTO chatbot_training_data (
        intent, utterances, responses, entities, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.intent,
        data.utterances,
        data.responses,
        data.entities || null,
        new Date(),
        new Date()
      ]
    );
    
    return this.mapChatbotTrainingDataFromDb(result.rows[0]);
  }
  
  async updateChatbotTrainingData(id: number, data: Partial<ChatbotTrainingData>): Promise<ChatbotTrainingData | undefined> {
    // Build SQL for updating only the fields that were provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.intent !== undefined) {
      updateFields.push(`intent = $${paramIndex++}`);
      values.push(data.intent);
    }
    
    if (data.utterances !== undefined) {
      updateFields.push(`utterances = $${paramIndex++}`);
      values.push(data.utterances);
    }
    
    if (data.responses !== undefined) {
      updateFields.push(`responses = $${paramIndex++}`);
      values.push(data.responses);
    }
    
    if (data.entities !== undefined) {
      updateFields.push(`entities = $${paramIndex++}`);
      values.push(data.entities);
    }
    
    // Always update the updatedAt field
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    
    // Add the training data ID to the WHERE clause
    values.push(id);
    
    if (updateFields.length === 0) return undefined;
    
    const result = await pool.query(
      `UPDATE chatbot_training_data SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapChatbotTrainingDataFromDb(result.rows[0]);
  }
  
  async deleteChatbotTrainingData(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM chatbot_training_data WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  // WhatsApp User Management
  async getChatbotUsers(): Promise<WhatsappUser[]> {
    const result = await pool.query(`SELECT * FROM whatsapp_users`);
    return result.rows.map(row => this.mapWhatsappUserFromDb(row));
  }
  
  async getChatbotUserByWhatsappNumber(whatsappNumber: string): Promise<WhatsappUser | undefined> {
    const result = await pool.query(
      `SELECT * FROM whatsapp_users WHERE whatsapp_number = $1`,
      [whatsappNumber]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapWhatsappUserFromDb(result.rows[0]);
  }
  
  async linkUserWhatsapp(userId: number, whatsappNumber: string): Promise<WhatsappUser | undefined> {
    // Check if the user already has a WhatsApp link
    const existingResult = await pool.query(
      `SELECT * FROM whatsapp_users WHERE whatsapp_number = $1`,
      [whatsappNumber]
    );
    
    if (existingResult.rows.length > 0) {
      // Update the existing record
      const result = await pool.query(
        `UPDATE whatsapp_users 
         SET "userId" = $1, "isVerified" = true, "isOptedIn" = true, "lastInteractionAt" = $2, "updatedAt" = $3
         WHERE whatsapp_number = $4
         RETURNING *`,
        [userId, new Date(), new Date(), whatsappNumber]
      );
      
      return this.mapWhatsappUserFromDb(result.rows[0]);
    } else {
      // Create a new record
      const result = await pool.query(
        `INSERT INTO whatsapp_users (
          "userId", "whatsappNumber", "isVerified", "isOptedIn", "lastInteractionAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId,
          whatsappNumber,
          true, // is_verified
          true, // is_opted_in
          new Date(), // last_interaction_at
          new Date(), // created_at
          new Date() // updated_at
        ]
      );
      
      return this.mapWhatsappUserFromDb(result.rows[0]);
    }
  }
  
  async optOutUserWhatsapp(userId: number): Promise<WhatsappUser | undefined> {
    const result = await pool.query(
      `UPDATE whatsapp_users 
       SET is_opted_in = false, updated_at = $1
       WHERE "userId" = $2
       RETURNING *`,
      [new Date(), userId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapWhatsappUserFromDb(result.rows[0]);
  }
  
  // WhatsApp Conversation Management
  async getChatbotConversations(): Promise<WhatsappConversation[]> {
    const result = await pool.query(`SELECT * FROM whatsapp_conversations`);
    return result.rows.map(row => this.mapWhatsappConversationFromDb(row));
  }
  
  async getChatbotConversation(id: number): Promise<WhatsappConversation | undefined> {
    const result = await pool.query(
      `SELECT * FROM whatsapp_conversations WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapWhatsappConversationFromDb(result.rows[0]);
  }
  
  async createChatbotConversation(data: InsertWhatsappConversation): Promise<WhatsappConversation> {
    const result = await pool.query(
      `INSERT INTO whatsapp_conversations (
        "userId", "whatsappNumber", "isActive", "lastMessageAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.userId,
        data.whatsappNumber,
        true, // is_active
        new Date(), // last_message_at
        new Date(), // created_at
        new Date() // updated_at
      ]
    );
    
    return this.mapWhatsappConversationFromDb(result.rows[0]);
  }
  
  async updateChatbotConversationStatus(id: number, status: 'active' | 'closed'): Promise<WhatsappConversation | undefined> {
    const result = await pool.query(
      `UPDATE whatsapp_conversations 
       SET is_active = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [status === 'active', new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapWhatsappConversationFromDb(result.rows[0]);
  }
  
  // WhatsApp Message Management
  async getChatbotMessages(conversationId: number): Promise<WhatsappMessage[]> {
    const result = await pool.query(
      `SELECT * FROM whatsapp_messages 
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    
    return result.rows.map(row => this.mapWhatsappMessageFromDb(row));
  }
  
  async addChatbotMessage(messageData: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const result = await pool.query(
      `INSERT INTO whatsapp_messages (
        conversation_id, content, direction, is_delivered, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        messageData.conversationId,
        messageData.content,
        messageData.direction,
        messageData.direction === 'outbound', // is_delivered
        false, // is_read
        new Date() // created_at
      ]
    );
    
    // Update the conversation's lastMessageAt timestamp
    await pool.query(
      `UPDATE whatsapp_conversations 
       SET last_message_at = $1, updated_at = $2
       WHERE id = $3`,
      [new Date(), new Date(), messageData.conversationId]
    );
    
    return this.mapWhatsappMessageFromDb(result.rows[0]);
  }
  
  // Mappers for chatbot-related entities
  private mapChatbotTemplateFromDb(row: any): ChatbotTemplate {
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapChatbotTrainingDataFromDb(row: any): ChatbotTrainingData {
    return {
      id: row.id,
      intent: row.intent,
      utterances: row.utterances,
      responses: row.responses,
      entities: row.entities,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapWhatsappUserFromDb(row: any): WhatsappUser {
    return {
      id: row.id,
      userId: row.userId,
      whatsappNumber: row.whatsapp_number,
      isVerified: row.is_verified,
      isOptedIn: row.is_opted_in,
      lastInteractionAt: row.last_interaction_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapWhatsappConversationFromDb(row: any): WhatsappConversation {
    return {
      id: row.id,
      userId: row.userId,
      whatsappNumber: row.whatsapp_number,
      isActive: row.is_active,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapWhatsappMessageFromDb(row: any): WhatsappMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      direction: row.direction,
      isDelivered: row.is_delivered,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }

  // Analytics-related methods for admin dashboard
  async getAllUsers(): Promise<User[]> {
    const result = await pool.query(`SELECT * FROM users`);
    return result.rows.map(row => this.mapUserFromDb(row));
  }

  async getGurujisByFilters(filters: {
    city?: string;
    pujaId?: number;
    specialization?: string;
    status?: string;
    date?: string;
    time?: string;
    duration?: number;
  }): Promise<GurujiProfile[]> {
    try {
      const status = filters.status || 'approved';
      let query = `
        SELECT gp.*, u."firstName", u."lastName", u.email, u.mobile 
        FROM guruji_profiles gp
        JOIN users u ON gp."userId" = u.id
        WHERE gp.status = $1 AND gp."isVerified" = true AND gp."isAvailable" = true
          AND u."isBlocked" = false
      `;
      const values: any[] = [status];
      let paramIndex = 2;

      // Filter by city: match primary city OR service cities array (case-insensitive)
      if (filters.city) {
        query += ` AND (REGEXP_REPLACE(LOWER(TRIM(gp.city)), '[[:space:]_-]+', ' ', 'g') = $${paramIndex} OR EXISTS (
          SELECT 1 FROM unnest(gp.cities) c WHERE REGEXP_REPLACE(LOWER(TRIM(c)), '[[:space:]_-]+', ' ', 'g') = $${paramIndex}
        ))`;
        values.push(filters.city.trim().toLowerCase().replace(/[\s_-]+/g, ' '));
        paramIndex++;
      }

      // Profiles may store pujas in either the join table or the legacy
      // specialities array (names or numeric IDs).
      if (filters.pujaId) {
        query += ` AND (
          EXISTS (
            SELECT 1 FROM guruji_pujas gpu
            WHERE gpu."gurujiId" = gp.id AND gpu."pujaId" = $${paramIndex}
          )
          OR EXISTS (
            SELECT 1 FROM pujas p
            JOIN unnest(gp.specialities) s
              ON LOWER(TRIM(s)) = LOWER(p.name)
              OR TRIM(s) = p.id::text
            WHERE p.id = $${paramIndex}
          )
        )`;
        values.push(filters.pujaId);
        paramIndex++;
      } else if (filters.specialization && filters.specialization.trim()) {
        // Fallback: filter by specialization name OR by legacy numeric puja ID in specialities array
        query += ` AND (
          EXISTS (
            SELECT 1 FROM unnest(gp.specialities) s WHERE LOWER(s) = LOWER($${paramIndex})
          )
          OR EXISTS (
            SELECT 1 FROM pujas p
            JOIN unnest(gp.specialities) s ON s ~ '^[0-9]+$' AND p.id = s::int
            WHERE LOWER(p.name) = LOWER($${paramIndex})
          )
          OR EXISTS (
            SELECT 1 FROM guruji_pujas gpu
            JOIN pujas p ON gpu."pujaId" = p.id
            WHERE gpu."gurujiId" = gp.id AND LOWER(p.name) = LOWER($${paramIndex})
          )
        )`;
        values.push(filters.specialization.trim());
        paramIndex++;
      }

      // Confirmed bookings occupy their saved duration (or the booked puja's
      // duration for older records). Match the booking submission check.
      // The live bookings table stores a calendar date and a separate
      // twelve-hour time string; compare local calendar times, not UTC dates.
      if (filters.date && filters.time && filters.duration !== undefined) {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM bookings b
          LEFT JOIN pujas booked_puja ON booked_puja.id = b."pujaId"
          CROSS JOIN LATERAL (
            SELECT CASE
              WHEN b.time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$'
                THEN to_timestamp(to_char(b.date, 'YYYY-MM-DD') || ' ' || b.time, 'YYYY-MM-DD HH12:MI AM')::timestamp
              ELSE b.date::timestamp
            END AS starts_at
          ) booked_slot
          WHERE b."gurujiId" = gp.id
            AND b.status::text IN ('confirmed', 'in_progress')
            AND booked_slot.starts_at < to_timestamp($${paramIndex} || ' ' || $${paramIndex + 1}, 'YYYY-MM-DD HH12:MI AM')::timestamp + GREATEST($${paramIndex + 2}::integer, 1) * INTERVAL '1 minute'
            AND booked_slot.starts_at + GREATEST(COALESCE(b.duration, booked_puja.duration, 120), 1) * INTERVAL '1 minute' > to_timestamp($${paramIndex} || ' ' || $${paramIndex + 1}, 'YYYY-MM-DD HH12:MI AM')::timestamp
        )`;
        values.push(filters.date, filters.time, filters.duration);
        paramIndex += 3;
      }

      query += ` ORDER BY gp.rating DESC, gp."totalReviews" DESC`;

      const result = await pool.query(query, values);
      const unavailable = filters.date && filters.time && filters.duration !== undefined
        ? await getUnavailableGurujiIds(result.rows.map(row => row.id), filters.date, filters.time, filters.duration)
        : new Set<number>();
      
      return result.rows.filter(row => !unavailable.has(row.id)).map(row => ({
        id: row.id,
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        mobile: row.mobile,
        bio: row.bio,
        experience: row.experience,
        specialization: Array.isArray(row.specialities) ? row.specialities.join(',') : (row.specialization || null),
        location: row.location,
        city: row.city,
        pincode: row.pincode,
        pricePerHour: row.pricePerHour,
        rating: parseFloat(row.rating) || 0,
        totalReviews: row.totalReviews || 0,
        isAvailable: row.isAvailable,
        isOnline: row.isOnline,
        isOffline: row.isOffline,
        languages: row.languages || [],
        profilePictureUrl: row.profile_picture_url || null,
        status: row.status,
        cities: Array.isArray(row.cities) ? row.cities : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: { id: row.userId, firstName: row.firstName, lastName: row.lastName },
      }));
    } catch (error) {
      console.error('Error getting gurujis by filters:', error);
      throw error;
    }
  }

  async getAllGurujiProfiles(status?: string): Promise<GurujiProfile[]> {
    let query = `
      SELECT gp.*, 
        u."firstName", u."lastName", u.email, u.mobile, u.age, u.gender,
        u.address AS user_address, u.city AS user_city, u.state AS user_state,
        u.pincode AS user_pincode, u.aadhar, u.caste, u."isVerified", u."isBlocked", u."createdAt" AS user_created_at
      FROM guruji_profiles gp
      LEFT JOIN users u ON u.id = gp."userId"
    `;
    const params: any[] = [];
    if (status) {
      query += ` WHERE gp.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY gp."createdAt" DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      ...this.mapGurujiProfileFromDb(row),
      user: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        mobile: row.mobile,
        age: row.age,
        gender: row.gender,
        address: row.user_address,
        city: row.user_city,
        state: row.user_state,
        pincode: row.user_pincode,
        aadhar: row.aadhar,
        caste: row.caste,
        isVerified: row.isVerified,
        isBlocked: row.isBlocked,
        createdAt: row.user_created_at,
      }
    }));
  }

  async getAllBookings(): Promise<Booking[]> {
    const result = await pool.query(`SELECT * FROM bookings ORDER BY "createdAt" DESC NULLS LAST, id DESC`);
    return result.rows.map(row => this.mapBookingFromDb(row));
  }

  async getAllPayments(): Promise<Payment[]> {
    const result = await pool.query(`SELECT * FROM payments`);
    return result.rows.map(row => this.mapPaymentFromDb(row));
  }

  async getAllReviews(): Promise<Review[]> {
    const result = await pool.query(`SELECT * FROM reviews`);
    return result.rows.map(row => this.mapReviewFromDb(row));
  }

  async getReviewByBookingId(bookingId: number): Promise<Review | undefined> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE "bookingId" = $1 AND from_role = 'customer' LIMIT 1`,
      [bookingId]
    );
    if (result.rows.length === 0) return undefined;
    return this.mapReviewFromDb(result.rows[0]);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const result = await pool.query(
      `SELECT * FROM users WHERE role = $1 ORDER BY "createdAt" DESC`,
      [role]
    );
    return result.rows.map(row => this.mapUserFromDb(row));
  }

  async getUsersByRegisteredBy(salesRepId: number): Promise<User[]> {
    const result = await pool.query(
      `SELECT * FROM users WHERE registered_by = $1 ORDER BY "createdAt" DESC`,
      [salesRepId]
    );
    return result.rows.map(row => this.mapUserFromDb(row));
  }

  async getAllNotifications(): Promise<Notification[]> {
    const result = await pool.query(`SELECT * FROM notifications`);
    return result.rows.map(row => this.mapNotificationFromDb(row));
  }

  // User Journey Management
  async getUserJourney(id: number): Promise<UserJourney | undefined> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_journeys WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapUserJourneyFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in getUserJourney:', error);
      return undefined;
    }
  }

  async getUserJourneyByUserId(userId: number): Promise<UserJourney[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_journeys WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
        [userId]
      );
      
      return result.rows.map(row => this.mapUserJourneyFromDb(row));
    } catch (error) {
      console.error('Error in getUserJourneyByUserId:', error);
      return [];
    }
  }

  async createUserJourney(journey: InsertUserJourney): Promise<UserJourney> {
    try {
      const result = await pool.query(
        `INSERT INTO user_journeys (
          "userId", title, description, stage, "totalPujas", 
          completed_pujas, goals, achievements, next_recommendation, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          journey.userId,
          journey.title,
          journey.description || null,
          journey.stage || 'beginner',
          journey.totalPujas || 0,
          journey.completedPujas || 0,
          journey.goals || null,
          journey.achievements || null,
          journey.nextRecommendation || null,
          new Date(),
          new Date()
        ]
      );
      
      return this.mapUserJourneyFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in createUserJourney:', error);
      throw error;
    }
  }

  async updateUserJourney(id: number, journey: Partial<UserJourney>): Promise<UserJourney | undefined> {
    try {
      const existingJourney = await this.getUserJourney(id);
      if (!existingJourney) return undefined;
      
      // Build SQL for updating only the fields that were provided
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (journey.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(journey.title);
      }
      
      if (journey.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(journey.description);
      }
      
      if (journey.stage !== undefined) {
        updateFields.push(`stage = $${paramIndex++}`);
        values.push(journey.stage);
      }
      
      if (journey.totalPujas !== undefined) {
        updateFields.push(`total_pujas = $${paramIndex++}`);
        values.push(journey.totalPujas);
      }
      
      if (journey.completedPujas !== undefined) {
        updateFields.push(`completed_pujas = $${paramIndex++}`);
        values.push(journey.completedPujas);
      }
      
      if (journey.goals !== undefined) {
        updateFields.push(`goals = $${paramIndex++}`);
        values.push(journey.goals);
      }
      
      if (journey.achievements !== undefined) {
        updateFields.push(`achievements = $${paramIndex++}`);
        values.push(journey.achievements);
      }
      
      if (journey.nextRecommendation !== undefined) {
        updateFields.push(`next_recommendation = $${paramIndex++}`);
        values.push(journey.nextRecommendation);
      }
      
      // Always update the updatedAt field
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      
      // Add the journey ID to the WHERE clause
      values.push(id);
      
      const result = await pool.query(
        `UPDATE user_journeys SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapUserJourneyFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in updateUserJourney:', error);
      return undefined;
    }
  }

  async updateUserJourneyProgress(journeyId: number, completedPujas: number): Promise<UserJourney | undefined> {
    try {
      const result = await pool.query(
        `UPDATE user_journeys 
         SET completed_pujas = $1, updated_at = $2
         WHERE id = $3
         RETURNING *`,
        [completedPujas, new Date(), journeyId]
      );
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapUserJourneyFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in updateUserJourneyProgress:', error);
      return undefined;
    }
  }

  async deleteUserJourney(id: number): Promise<boolean> {
    try {
      // First delete all items associated with this journey
      await pool.query(
        `DELETE FROM user_journey_items WHERE journey_id = $1`,
        [id]
      );
      
      // Then delete the journey
      const result = await pool.query(
        `DELETE FROM user_journeys WHERE id = $1`,
        [id]
      );
      
      return result.rowCount && result.rowCount > 0;
    } catch (error) {
      console.error('Error in deleteUserJourney:', error);
      return false;
    }
  }

  // User Journey Items Management
  async getUserJourneyItem(id: number): Promise<UserJourneyItem | undefined> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_journey_items WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapUserJourneyItemFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in getUserJourneyItem:', error);
      return undefined;
    }
  }

  async getUserJourneyItemsByJourneyId(journeyId: number): Promise<UserJourneyItem[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_journey_items 
         WHERE journey_id = $1
         ORDER BY sequence ASC`,
        [journeyId]
      );
      
      return result.rows.map(row => this.mapUserJourneyItemFromDb(row));
    } catch (error) {
      console.error('Error in getUserJourneyItemsByJourneyId:', error);
      return [];
    }
  }

  async createUserJourneyItem(item: InsertUserJourneyItem): Promise<UserJourneyItem> {
    try {
      // Check if the journey exists
      const journey = await this.getUserJourney(item.journeyId);
      if (!journey) {
        throw new Error(`Journey with ID ${item.journeyId} not found`);
      }
      
      const result = await pool.query(
        `INSERT INTO user_journey_items (
          journey_id, puja_id, booking_id, title, description,
          is_completed, completed_at, reflection, sequence,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          item.journeyId,
          item.pujaId || null,
          item.bookingId || null,
          item.title,
          item.description || null,
          item.isCompleted || false,
          item.completedAt || null,
          item.reflection || null,
          item.sequence,
          new Date(),
          new Date()
        ]
      );
      
      return this.mapUserJourneyItemFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in createUserJourneyItem:', error);
      throw error;
    }
  }

  async updateUserJourneyItem(id: number, item: Partial<UserJourneyItem>): Promise<UserJourneyItem | undefined> {
    try {
      const existingItem = await this.getUserJourneyItem(id);
      if (!existingItem) return undefined;
      
      // Build SQL for updating only the fields that were provided
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (item.pujaId !== undefined) {
        updateFields.push(`puja_id = $${paramIndex++}`);
        values.push(item.pujaId);
      }
      
      if (item.bookingId !== undefined) {
        updateFields.push(`booking_id = $${paramIndex++}`);
        values.push(item.bookingId);
      }
      
      if (item.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(item.title);
      }
      
      if (item.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(item.description);
      }
      
      if (item.isCompleted !== undefined) {
        updateFields.push(`is_completed = $${paramIndex++}`);
        values.push(item.isCompleted);
      }
      
      if (item.completedAt !== undefined) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        values.push(item.completedAt);
      }
      
      if (item.reflection !== undefined) {
        updateFields.push(`reflection = $${paramIndex++}`);
        values.push(item.reflection);
      }
      
      if (item.sequence !== undefined) {
        updateFields.push(`sequence = $${paramIndex++}`);
        values.push(item.sequence);
      }
      
      // Always update the updatedAt field
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      
      // Add the item ID to the WHERE clause
      values.push(id);
      
      const result = await pool.query(
        `UPDATE user_journey_items SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapUserJourneyItemFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error in updateUserJourneyItem:', error);
      return undefined;
    }
  }

  async markUserJourneyItemComplete(id: number, reflection?: string): Promise<UserJourneyItem | undefined> {
    try {
      const result = await pool.query(
        `UPDATE user_journey_items 
         SET is_completed = true, 
             completed_at = $1, 
             reflection = $2,
             updated_at = $3
         WHERE id = $4
         RETURNING *`,
        [new Date(), reflection || null, new Date(), id]
      );
      
      if (result.rows.length === 0) return undefined;
      
      const updatedItem = this.mapUserJourneyItemFromDb(result.rows[0]);
      
      // Update the journey's completed pujas count
      const journeyItems = await this.getUserJourneyItemsByJourneyId(updatedItem.journeyId);
      const completedCount = journeyItems.filter(item => item.isCompleted).length;
      
      await this.updateUserJourneyProgress(updatedItem.journeyId, completedCount);
      
      return updatedItem;
    } catch (error) {
      console.error('Error in markUserJourneyItemComplete:', error);
      return undefined;
    }
  }

  async deleteUserJourneyItem(id: number): Promise<boolean> {
    try {
      const item = await this.getUserJourneyItem(id);
      if (!item) return false;
      
      const result = await pool.query(
        `DELETE FROM user_journey_items WHERE id = $1`,
        [id]
      );
      
      if (result.rowCount && result.rowCount > 0) {
        // Update the journey's completed pujas count
        const journeyItems = await this.getUserJourneyItemsByJourneyId(item.journeyId);
        const completedCount = journeyItems.filter(item => item.isCompleted).length;
        await this.updateUserJourneyProgress(item.journeyId, completedCount);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in deleteUserJourneyItem:', error);
      return false;
    }
  }

  // Mapping functions for journey entities
  private mapUserJourneyFromDb(row: any): UserJourney {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description,
      stage: row.stage,
      totalPujas: row.total_pujas,
      completedPujas: row.completed_pujas,
      goals: row.goals,
      achievements: row.achievements,
      nextRecommendation: row.next_recommendation,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapUserJourneyItemFromDb(row: any): UserJourneyItem {
    return {
      id: row.id,
      journeyId: row.journey_id,
      pujaId: row.puja_id,
      bookingId: row.booking_id,
      title: row.title,
      description: row.description,
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      reflection: row.reflection,
      sequence: row.sequence,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Cities Management Methods
  async getAllCities(): Promise<City[]> {
    try {
      const result = await pool.query('SELECT * FROM cities ORDER BY name ASC');
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        state: row.state,
        isActive: row.isActive ?? true,
        createdAt: row.createdAt || new Date(),
        updatedAt: row.updatedAt || new Date()
      }));
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }

  async createCity(city: InsertCity): Promise<City> {
    try {
      const result = await pool.query(
        `INSERT INTO cities (name, state, "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [city.name, city.state, city.isActive ?? true, new Date(), new Date()]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating city:', error);
      throw error;
    }
  }

  async updateCity(id: number, city: Partial<City>): Promise<City | undefined> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (city.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(city.name);
        paramIndex++;
      }

      if (city.state !== undefined) {
        updateFields.push(`state = $${paramIndex}`);
        values.push(city.state);
        paramIndex++;
      }

      if (city.isActive !== undefined) {
        updateFields.push(`"isActive" = $${paramIndex}`);
        values.push(city.isActive);
        paramIndex++;
      }

      updateFields.push(`"updatedAt" = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(id);

      if (updateFields.length === 1) return undefined;

      const result = await pool.query(
        `UPDATE cities SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating city:', error);
      throw error;
    }
  }

  async deleteCity(id: number): Promise<boolean> {
    try {
      const result = await pool.query('DELETE FROM cities WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting city:', error);
      throw error;
    }
  }
}

export const dbStorage = new DBStorage();
