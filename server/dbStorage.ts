import { 
  type User, type InsertUser, 
  type Otp, type InsertOtp,
  type Puja, type InsertPuja,
  type GurujiProfile, type InsertGurujiProfile,
  type Booking, type InsertBooking,
  type Payment, type InsertPayment,
  type Review, type InsertReview,
  type Notification, type InsertNotification
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
      `SELECT * FROM users WHERE id = `,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    
    const result = await pool.query(
      `SELECT * FROM users WHERE email = `,
      [email]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapUserFromDb(result.rows[0]);
  }
  
  async getUserByMobile(mobile: string): Promise<User | undefined> {
    if (!mobile) return undefined;
    
    const result = await pool.query(
      `SELECT * FROM users WHERE mobile = `,
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
        first_name, last_name, email, mobile, password, 
        age, gender, role, aadhar, caste, 
        is_verified, is_blocked, created_at, updated_at
      ) VALUES (, , , , , , , , , 0, 1, 2, 3, 4)
      RETURNING *`,
      [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.mobile,
        hashedPassword,
        userData.age,
        userData.gender,
        userData.role,
        userData.aadhar || null,
        userData.caste || null,
        false, // is_verified
        false, // is_blocked
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
      `UPDATE users SET is_blocked = true, updated_at =  WHERE id = `,
      [new Date(), id]
    );
    
    return result.rowCount > 0;
  }
  
  async unblockUser(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET is_blocked = false, updated_at =  WHERE id = `,
      [new Date(), id]
    );
    
    return result.rowCount > 0;
  }
  
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT password FROM users WHERE id = `,
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].password) return false;
    
    return compare(password, result.rows[0].password);
  }
  
  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hash(newPassword, 10);
    
    const result = await pool.query(
      `UPDATE users SET password = , updated_at =  WHERE id = `,
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
        "imageUrl", "isPopular", "isActive", price, created_at, updated_at
      ) VALUES (, , , , , , , , , 0, 1, 2)
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
        pujaData.basePrice, // Setting price equal to basePrice
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
    updateFields.push(`updated_at = $${paramIndex++}`);
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
      `UPDATE pujas SET "isActive" = false, updated_at =  WHERE id = `,
      [new Date(), id]
    );
    
    return result.rowCount > 0;
  }
  
  async searchPujas(query: string): Promise<Puja[]> {
    const result = await pool.query(
      `SELECT * FROM pujas 
       WHERE name ILIKE  AND "isActive" = true`,
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
      `SELECT * FROM guruji_profiles WHERE user_id = `,
      [userId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapGurujiProfileFromDb(result.rows[0]);
  }
  
  async createGurujiProfile(profileData: InsertGurujiProfile): Promise<GurujiProfile> {
    const result = await pool.query(
      `INSERT INTO guruji_profiles (
        user_id, bio, experience, specialization, location,
        radius, languages, availability, certificate, "imageUrl",
        "isConsultation", "isAvailable", rating, "totalReviews",
        created_at, updated_at
      ) VALUES (, , , , , , , , , 0, 1, 2, 3, 4, 5, 6)
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
      JOIN users u ON gp.user_id = u.id
      WHERE u.is_blocked = false AND gp."isAvailable" = true
        AND LOWER(gp.location) LIKE LOWER()
    `;
    
    const params: any[] = [`%${city}%`];
    
    // If pujaId is provided, filter by gurujis who can perform this puja
    if (pujaId) {
      query += ` 
        AND EXISTS (
          SELECT 1 FROM guruji_pujas gpu
          WHERE gpu.guruji_profile_id = gp.id AND gpu.puja_id = 
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
      `SELECT * FROM bookings WHERE id = `,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE customer_id =  ORDER BY date DESC`,
      [customerId]
    );
    
    return result.rows.map(row => this.mapBookingFromDb(row));
  }
  
  async getBookingsByGurujiId(gurujiId: number): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE guruji_id =  ORDER BY date DESC`,
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
      ) VALUES (, , , , , , , , , 0, 1, 2, 3, 4, 5)
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
      `UPDATE bookings SET status = , updated_at =  WHERE id =  RETURNING *`,
      [status, new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
  }
  
  async assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined> {
    const result = await pool.query(
      `UPDATE bookings SET guruji_id = , status = 'confirmed', updated_at =  
       WHERE id =  RETURNING *`,
      [gurujiId, new Date(), bookingId]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapBookingFromDb(result.rows[0]);
  }

  // Payment Management
  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = `,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapPaymentFromDb(result.rows[0]);
  }
  
  async getPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
    const result = await pool.query(
      `SELECT * FROM payments WHERE booking_id =  ORDER BY created_at DESC`,
      [bookingId]
    );
    
    return result.rows.map(row => this.mapPaymentFromDb(row));
  }
  
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const result = await pool.query(
      `INSERT INTO payments (
        booking_id, amount, status, transaction_id, payment_method,
        created_at, updated_at
      ) VALUES (, , , , , , )
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
      `UPDATE payments SET status = , updated_at =  WHERE id =  RETURNING *`,
      [status, new Date(), id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapPaymentFromDb(result.rows[0]);
  }

  // Review Management
  async getReview(id: number): Promise<Review | undefined> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE id = `,
      [id]
    );
    
    if (result.rows.length === 0) return undefined;
    
    return this.mapReviewFromDb(result.rows[0]);
  }
  
  async getReviewsByGurujiId(gurujiId: number): Promise<Review[]> {
    const result = await pool.query(
      `SELECT * FROM reviews WHERE guruji_id =  ORDER BY created_at DESC`,
      [gurujiId]
    );
    
    return result.rows.map(row => this.mapReviewFromDb(row));
  }
  
  async createReview(reviewData: InsertReview): Promise<Review> {
    const result = await pool.query(
      `INSERT INTO reviews (
        customer_id, guruji_id, booking_id, rating, review, created_at
      ) VALUES (, , , , , )
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
       WHERE guruji_id = `,
      [gurujiId]
    );
    
    if (result.rows.length > 0) {
      const { avg_rating, count } = result.rows[0];
      
      await pool.query(
        `UPDATE guruji_profiles
         SET rating = , "totalReviews" = , updated_at = 
         WHERE id = `,
        [parseFloat(avg_rating) || 0, parseInt(count) || 0, new Date(), gurujiId]
      );
    }
  }

  // Notification Management
  async getNotifications(userId: number): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id =  
       ORDER BY is_read ASC, created_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapNotificationFromDb(row));
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (
        user_id, title, message, is_read, created_at
      ) VALUES (, , , , )
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
      `UPDATE notifications SET is_read = true WHERE id = `,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = `,
      [id]
    );
    
    return result.rowCount > 0;
  }

  // Content Management
  async getContent(key: string): Promise<any | undefined> {
    const result = await pool.query(
      `SELECT * FROM contents WHERE key = `,
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
        `UPDATE contents SET title = , content =  WHERE key =  RETURNING *`,
        [title, content, key]
      );
      
      return result.rows[0];
    } else {
      // Create new content
      const result = await pool.query(
        `INSERT INTO contents (key, title, content) VALUES (, , ) RETURNING *`,
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
      userId: row.user_id,
      bio: row.bio,
      experience: row.experience,
      specialization: row.specialization,
      location: row.location,
      radius: row.radius,
      languages: row.languages,
      availability: row.availability,
      certificate: row.certificate,
      imageUrl: row.imageUrl,
      isConsultation: row.isConsultation,
      isAvailable: row.isAvailable,
      rating: row.rating,
      totalReviews: row.totalReviews,
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
      time: row.time,
      status: row.status,
      type: row.type,
      duration: row.duration,
      amount: row.amount,
      consultationType: row.consultation_type,
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
      userId: row.user_id,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }
}

export const dbStorage = new DBStorage();
