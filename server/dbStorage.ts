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
import { hash, compare } from 'bcrypt';
import { IStorage } from './storage';

/**
 * PostgreSQL implementation of the Storage interface using direct SQL queries
 * This bypasses Drizzle ORM to work directly with the database schema
 */
export class DBStorage implements IStorage {
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
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async getUserByMobile(mobile: string): Promise<User | undefined> {
    if (!mobile) return undefined;
    
    const result = await pool.query(
      `SELECT * FROM users WHERE mobile = $1`,
      [mobile]
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
    
    const result = await pool.query(
      `INSERT INTO users (
        "firstName", "lastName", email, mobile, password, 
        role, "isVerified", "isBlocked", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.mobile,
        hashedPassword,
        userData.role || 'customer',
        false, // isVerified
        false, // isBlocked
        new Date(),
        new Date()
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
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(userData.firstName);
    }
    
    if (userData.lastName !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
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
      updateFields.push(`is_verified = $${paramIndex++}`);
      values.push(userData.isVerified);
    }
    
    if (userData.isBlocked !== undefined) {
      updateFields.push(`is_blocked = $${paramIndex++}`);
      values.push(userData.isBlocked);
    }
    
    // Always update the updatedAt field
    updateFields.push(`updated_at = $${paramIndex++}`);
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
      `UPDATE users SET is_blocked = true, updated_at = $1 WHERE id = $2`,
      [new Date(), id]
    );
    
    return result.rowCount > 0;
  }
  
  async unblockUser(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET is_blocked = false, updated_at = $1 WHERE id = $2`,
      [new Date(), id]
    );
    
    return result.rowCount > 0;
  }
  
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].password) return false;
    
    return compare(password, result.rows[0].password);
  }
  
  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hash(newPassword, 10);
    
    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`,
      [hashedPassword, new Date(), userId]
    );
    
    return result.rowCount > 0;
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
      `SELECT * FROM pujas WHERE id = `,
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
        "imageUrl", "isPopular", "isActive", price, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        pujaData.name,
        pujaData.description,
        pujaData.basePrice,
        pujaData.type,
        pujaData.duration,
        pujaData.items || null,
        pujaData.imageUrl || null,
        pujaData.isPopular || false,
        pujaData.isActive || true,
        pujaData.price || pujaData.basePrice, // Use price if provided, otherwise basePrice
        new Date(),
        new Date()
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
      `SELECT * FROM guruji_profiles WHERE id = `,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async getGurujiProfileByUserId(userId: number): Promise<GurujiProfile | undefined> {
    const result = await pool.query(
      `SELECT * FROM guruji_profiles WHERE "userId" = `,
      [userId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async createGurujiProfile(profileData: InsertGurujiProfile): Promise<GurujiProfile> {
    const result = await pool.query(
      `INSERT INTO guruji_profiles (
        "userId", bio, experience, specialization, location,
        radius, languages, availability, certificate, "imageUrl",
        "isConsultation", "isAvailable", rating, "totalReviews",
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        profileData.userId,
        profileData.bio || null,
        profileData.experience || null,
        profileData.specialization || null,
        profileData.location,
        profileData.radius || 10,
        profileData.languages || null,
        profileData.availability || null,
        profileData.certificate || null,
        profileData.imageUrl || null,
        profileData.isConsultation || false,
        profileData.isAvailable || true,
        0, // Initial rating
        0, // Initial total reviews
        new Date(),
        new Date()
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
  
  async getNearbyGurujis(city: string, pujaId?: number, radius: number = 10): Promise<GurujiProfile[]> {
    // For now, just filter by city
    // In a real implementation, we would use geolocation data and calculate distance
    
    let query = `
      SELECT gp.* FROM guruji_profiles gp
      JOIN users u ON gp."userId" = u.id
      WHERE u.is_blocked = false AND gp."isAvailable" = true
        AND LOWER(gp.location) LIKE LOWER($1)
    `;
    
    const params: any[] = [`%${city}%`];
    
    // If pujaId is provided, filter by gurujis who can perform this puja
    if (pujaId) {
      query += ` 
        AND EXISTS (
          SELECT 1 FROM guruji_pujas gpu
          WHERE gpu.guruji_profile_id = gp.id AND gpu.puja_id = $2
        )
      `;
      params.push(pujaId);
    }
    
    const result = await pool.query(query, params);
    
    return result.rows.map(row => this.mapGurujiProfileFromDb(row));
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
      `SELECT * FROM bookings WHERE customer_id = $1 ORDER BY date DESC`,
      [customerId]
    );
    
    return result.rows.map(row => this.mapBookingFromDb(row));
  }
  
  async getBookingsByGurujiId(gurujiId: number): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE guruji_id = $1 ORDER BY date DESC`,
      [gurujiId]
    );
    
    return result.rows.map(row => this.mapBookingFromDb(row));
  }
  
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const result = await pool.query(
      `INSERT INTO bookings (
        customer_id, guruji_id, puja_id, address, city, date,
        time, status, type, duration, amount, consultation_type,
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        bookingData.customerId,
        bookingData.gurujiId || null,
        bookingData.pujaId || null,
        bookingData.address || null,
        bookingData.city,
        bookingData.date,
        bookingData.time || null,
        bookingData.status || 'pending',
        bookingData.type,
        bookingData.duration,
        bookingData.amount,
        bookingData.consultationType || null,
        bookingData.notes || null,
        new Date(),
        new Date()
      ]
    );
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<Booking | undefined> {
    const result = await pool.query(
      `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [status, new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined> {
    const result = await pool.query(
      `UPDATE bookings SET guruji_id = $1, status = 'confirmed', updated_at = $2 
       WHERE id = $3 RETURNING *`,
      [gurujiId, new Date(), bookingId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
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
      `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
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
      `SELECT * FROM reviews WHERE guruji_id = $1 ORDER BY created_at DESC`,
      [gurujiId]
    );
    
    return result.rows.map(row => this.mapReviewFromDb(row));
  }
  
  async createReview(reviewData: InsertReview): Promise<Review> {
    const result = await pool.query(
      `INSERT INTO reviews (
        customer_id, guruji_id, booking_id, rating, review, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        reviewData.customerId,
        reviewData.gurujiId,
        reviewData.bookingId,
        reviewData.rating,
        reviewData.review || null,
        new Date()
      ]
    );
    
    // Update guruji profile with new rating
    await this.updateGurujiRating(reviewData.gurujiId);
    
    return this.mapReviewFromDb(result.rows[0]);
  }
  
  // Helper method to update guruji rating after a new review
  private async updateGurujiRating(gurujiId: number): Promise<void> {
    const result = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews
       WHERE guruji_id = $1`,
      [gurujiId]
    );
    
    if (result.rows.length > 0) {
      const { avg_rating, count } = result.rows[0];
      
      await pool.query(
        `UPDATE guruji_profiles
         SET rating = $1, "totalReviews" = $2, updated_at = $3
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
       ORDER BY is_read ASC, created_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapNotificationFromDb(row));
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (
        "userId", title, message, "isRead", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        false, // is_read
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
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      mobile: row.mobile,
      password: row.password,
      age: row.age,
      gender: row.gender,
      role: row.role,
      aadhar: row.aadhar,
      caste: row.caste,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      isVerified: row.is_verified,
      isBlocked: row.is_blocked,
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapGurujiProfileFromDb(row: any): GurujiProfile {
    return {
      id: row.id,
      userId: row.userId,
      bio: row.bio,
      experience: row.experience,
      specialization: row.specialization,
      location: row.location,
      radius: row.radius,
      languages: row.languages,
      pricePerHour: row.price_per_hour,
      isOnline: row.is_online,
      isOffline: row.is_offline,
      isConsultation: row.is_consultation,
      isAvailable: row.is_available,
      aadharVerified: row.aadhar_verified,
      documentsVerified: row.documents_verified,
      verificationDate: row.verification_date,
      rating: row.rating,
      totalReviews: row.total_reviews,
      certificates: row.certificates,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapBookingFromDb(row: any): Booking {
    return {
      id: row.id,
      customerId: row.customer_id,
      gurujiId: row.guruji_id,
      pujaId: row.puja_id,
      address: row.address,
      city: row.city,
      date: row.date,
      status: row.status,
      type: row.type,
      duration: row.duration,
      amount: row.amount,
      consultationType: row.consultation_type,
      isImmediate: row.is_immediate,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapPaymentFromDb(row: any): Payment {
    return {
      id: row.id,
      bookingId: row.booking_id,
      amount: row.amount,
      status: row.status,
      transactionId: row.transaction_id,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  private mapReviewFromDb(row: any): Review {
    return {
      id: row.id,
      customerId: row.customer_id,
      gurujiId: row.guruji_id,
      bookingId: row.booking_id,
      rating: row.rating,
      review: row.review,
      createdAt: row.created_at
    };
  }
  
  private mapNotificationFromDb(row: any): Notification {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      message: row.message,
      type: row.type || 'general', // Add missing type field with default value
      isRead: row.is_read,
      createdAt: row.created_at
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
  }): Promise<GurujiProfile[]> {
    try {
      let query = `
        SELECT gp.*, u."firstName", u."lastName", u.email, u.mobile 
        FROM guruji_profiles gp
        JOIN users u ON gp."userId" = u.id
        WHERE 1=1
      `;
      const values: any[] = [filters.status || 'approved'];
      let paramIndex = 2;

      // Filter by city
      if (filters.city) {
        query += ` AND (gp.location ILIKE $${paramIndex} OR gp.cities LIKE $${paramIndex})`;
        values.push(`%${filters.city}%`);
        paramIndex++;
      }

      // Filter by puja specialization
      if (filters.specialization) {
        query += ` AND gp.specialization ILIKE $${paramIndex}`;
        values.push(`%${filters.specialization}%`);
        paramIndex++;
      }

      query += ` ORDER BY gp.rating DESC, gp."totalReviews" DESC`;

      const result = await pool.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        mobile: row.mobile,
        bio: row.bio,
        experience: row.experience,
        specialization: row.specialization,
        location: row.location,
        pricePerHour: row.pricePerHour,
        rating: parseFloat(row.rating) || 0,
        totalReviews: row.totalReviews || 0,
        isAvailable: row.isAvailable,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));
    } catch (error) {
      console.error('Error getting gurujis by filters:', error);
      throw error;
    }
  }

  async getAllGurujiProfiles(): Promise<GurujiProfile[]> {
    const result = await pool.query(`SELECT * FROM guruji_profiles`);
    return result.rows.map(row => this.mapGurujiProfileFromDb(row));
  }

  async getAllBookings(): Promise<Booking[]> {
    const result = await pool.query(`SELECT * FROM bookings`);
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
        isActive: row.isActive || true,
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
        [city.name, city.state, city.isActive || true, new Date(), new Date()]
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
