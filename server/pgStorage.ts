import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { eq, like } from 'drizzle-orm';
import { 
  User, InsertUser, 
  Otp, InsertOtp,
  Puja, InsertPuja, 
  GurujiProfile, InsertGurujiProfile,
  Booking, InsertBooking,
  Payment, InsertPayment,
  Review, InsertReview,
  Notification, InsertNotification 
} from '@shared/schema';
import { 
  users, otps, pujas, 
  gurujiProfiles, bookings, 
  payments, reviews, notifications, 
  contents 
} from '@shared/schema';
import { IStorage } from './storage';
import { hash, compare } from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL!;

// For use with migrations and SQL queries
const migrationClient = postgres(connectionString, { max: 1 });

// For use with Drizzle ORM
const queryClient = postgres(connectionString);
const db = drizzle(queryClient);

/**
 * PostgreSQL implementation of the Storage interface
 */
// A custom type for specific query operations
type AnyObject = { [key: string]: any };

export class PgStorage implements IStorage {
  
  /**
   * Initialize the database
   * This runs migrations and sets up initial data
   */
  async initialize() {
    try {
      console.log('Running migrations...');
      await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
      console.log('Migrations complete');
      
      // Initialize default data if needed
      await this.initializeDefaultPujas();
      
      console.log('Database initialization complete');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  /**
   * Initialize default pujas if none exist
   */
  private async initializeDefaultPujas() {
    const existingPujas = await db.select().from(pujas);
    
    if (existingPujas.length === 0) {
      console.log('Creating default pujas...');
      
      const defaultPujas = [
        {
          name: 'Satyanarayan Puja',
          description: 'A ceremony dedicated to Lord Vishnu, seeking blessings for prosperity and peace.',
          duration: 120,
          basePrice: 2500,
          type: 'offline',
          items: ['Rice', 'Fruits', 'Flowers', 'Ghee', 'Sugar', 'Incense sticks'],
          imageUrl: '/images/pujas/satyanarayan.jpg',
          isPopular: true,
          isActive: true
        },
        {
          name: 'Griha Pravesh',
          description: 'A house warming ceremony performed when entering a new home.',
          duration: 180,
          basePrice: 4000,
          type: 'offline',
          items: ['Coconut', 'Rice', 'Fruits', 'Flowers', 'Ghee', 'Mango leaves'],
          imageUrl: '/images/pujas/griha-pravesh.jpg',
          isPopular: true,
          isActive: true
        },
        {
          name: 'Ganesh Puja',
          description: 'A ceremony dedicated to Lord Ganesha, the remover of obstacles.',
          duration: 90,
          basePrice: 1800,
          type: 'both',
          items: ['Modak', 'Red flowers', 'Durva grass', 'Red sandal paste'],
          imageUrl: '/images/pujas/ganesh.jpg',
          isPopular: true,
          isActive: true
        },
        {
          name: 'Navgraha Shanti',
          description: 'A ceremony to pacify the nine planets and seek their blessings.',
          duration: 150,
          basePrice: 3200,
          type: 'both',
          items: ['Nine types of grains', 'Nine types of fruits', 'Nine types of flowers'],
          imageUrl: '/images/pujas/navgraha.jpg',
          isPopular: false,
          isActive: true
        },
        {
          name: 'Rudrabhishek',
          description: 'A powerful ritual dedicated to Lord Shiva to seek his divine blessings.',
          duration: 120,
          basePrice: 2800,
          type: 'both',
          items: ['Milk', 'Curd', 'Honey', 'Ghee', 'Sugar', 'Bel leaves'],
          imageUrl: '/images/pujas/rudrabhishek.jpg',
          isPopular: false,
          isActive: true
        },
        {
          name: 'Mahamrityunjaya Jaap',
          description: 'A sacred chant dedicated to Lord Shiva for health and longevity.',
          duration: 60,
          basePrice: 1500,
          type: 'online',
          items: ['Rudraksha mala', 'Ghee lamp'],
          imageUrl: '/images/pujas/mahamrityunjaya.jpg',
          isPopular: false,
          isActive: true
        }
      ];
      
      for (const puja of defaultPujas) {
        await db.insert(pujas).values({
          name: puja.name,
          description: puja.description,
          type: puja.type === 'both' ? 'offline' : puja.type,
          duration: puja.duration,
          basePrice: puja.basePrice,
          items: puja.items,
          imageUrl: puja.imageUrl,
          isPopular: puja.isPopular,
          isActive: puja.isActive,
          price: puja.basePrice,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      console.log('Default pujas created');
    }
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async getUserByMobile(mobile: string): Promise<User | undefined> {
    if (!mobile) return undefined;
    const result = await db.select().from(users).where(eq(users.mobile, mobile));
    return result[0];
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await hash(userData.password, 10);
    }
    
    const result = await db.insert(users).values({
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      mobile: userData.mobile,
      password: userData.password,
      age: userData.age,
      gender: userData.gender,
      role: userData.role,
      aadhar: userData.aadhar || null,
      caste: userData.caste || null,
      is_verified: false,
      is_blocked: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Hash new password if provided
    if (userData.password) {
      userData.password = await hash(userData.password, 10);
    }
    
    const updateData: any = {};
    
    if (userData.firstName) updateData.first_name = userData.firstName;
    if (userData.lastName) updateData.last_name = userData.lastName;
    if (userData.email) updateData.email = userData.email;
    if (userData.mobile) updateData.mobile = userData.mobile;
    if (userData.password) updateData.password = userData.password;
    if (userData.age) updateData.age = userData.age;
    if (userData.gender) updateData.gender = userData.gender;
    if (userData.role) updateData.role = userData.role;
    if ('aadhar' in userData) updateData.aadhar = userData.aadhar;
    if ('caste' in userData) updateData.caste = userData.caste;
    if ('isVerified' in userData) updateData.is_verified = userData.isVerified;
    if ('isBlocked' in userData) updateData.is_blocked = userData.isBlocked;
    
    updateData.updated_at = new Date();
    
    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser[0];
  }
  
  async blockUser(id: number): Promise<boolean> {
    const result = await db.update(users)
      .set({
        is_blocked: true,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
    
    return !!result;
  }
  
  async unblockUser(id: number): Promise<boolean> {
    const result = await db.update(users)
      .set({
        is_blocked: false,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
    
    return !!result;
  }
  
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.password) return false;
    
    return compare(password, user.password);
  }
  
  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hash(newPassword, 10);
    
    const result = await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    return !!result;
  }

  // OTP Management
  async createOtp(otpData: InsertOtp): Promise<Otp> {
    // First delete any existing OTPs for this mobile
    await db.delete(otps).where(eq(otps.mobile, otpData.mobile));
    
    // Then insert the new OTP
    const result = await db.insert(otps).values({
      ...otpData,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async getOtpByMobile(mobile: string): Promise<Otp | undefined> {
    const result = await db.select().from(otps).where(eq(otps.mobile, mobile));
    return result[0];
  }
  
  async verifyOtp(mobile: string, otpValue: string): Promise<boolean> {
    const otpRecord = await this.getOtpByMobile(mobile);
    if (!otpRecord) return false;
    
    // Check if OTP matches and is not expired
    const isExpired = new Date() > otpRecord.expiresAt;
    return otpRecord.otp === otpValue && !isExpired;
  }
  
  async deleteOtp(mobile: string): Promise<boolean> {
    const result = await db.delete(otps).where(eq(otps.mobile, mobile));
    return !!result;
  }

  // Puja Management
  async getPuja(id: number): Promise<Puja | undefined> {
    const result = await db.select().from(pujas).where(eq(pujas.id, id));
    return result[0];
  }
  
  async getAllPujas(): Promise<Puja[]> {
    return db.select().from(pujas).execute();
  }
  
  async createPuja(pujaData: InsertPuja): Promise<Puja> {
    const result = await db.insert(pujas).values({
      ...pujaData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updatePuja(id: number, pujaData: Partial<Puja>): Promise<Puja | undefined> {
    const updatedPuja = await db.update(pujas)
      .set({
        ...pujaData,
        updatedAt: new Date()
      })
      .where(eq(pujas.id, id))
      .returning();
    
    return updatedPuja[0];
  }
  
  async deletePuja(id: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await db.update(pujas)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(pujas.id, id));
    
    return !!result;
  }
  
  async searchPujas(query: string): Promise<Puja[]> {
    return db.select().from(pujas)
      .where(like(pujas.name, `%${query}%`))
      .where(eq(pujas.isActive, true))
      .execute();
  }

  // Guruji Profile Management
  async getGurujiProfile(id: number): Promise<GurujiProfile | undefined> {
    const result = await db.select().from(gurujiProfiles).where(eq(gurujiProfiles.id, id));
    return result[0];
  }
  
  async getGurujiProfileByUserId(userId: number): Promise<GurujiProfile | undefined> {
    const result = await db.select().from(gurujiProfiles).where(eq(gurujiProfiles.userId, userId));
    return result[0];
  }
  
  async createGurujiProfile(profileData: InsertGurujiProfile): Promise<GurujiProfile> {
    const result = await db.insert(gurujiProfiles).values({
      ...profileData,
      rating: 0,
      totalReviews: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateGurujiProfile(id: number, profileData: Partial<GurujiProfile>): Promise<GurujiProfile | undefined> {
    const updatedProfile = await db.update(gurujiProfiles)
      .set({
        ...profileData,
        updatedAt: new Date()
      })
      .where(eq(gurujiProfiles.id, id))
      .returning();
    
    return updatedProfile[0];
  }
  
  async getNearbyGurujis(city: string, pujaId?: number, radius: number = 10): Promise<GurujiProfile[]> {
    // For now, just filter by city
    // In a real implementation, we would use geolocation data and calculate distance
    
    return db.select().from(gurujiProfiles)
      .where(eq(gurujiProfiles.city, city))
      .where(eq(gurujiProfiles.isAvailable, true))
      .execute();
    
    // TODO: If pujaId is provided, filter by gurujis who can perform this puja
    // This would require joining with the gurujiPujas table
  }

  // Booking Management
  async getBooking(id: number): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }
  
  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.customerId, customerId)).execute();
  }
  
  async getBookingsByGurujiId(gurujiId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.gurujiId, gurujiId)).execute();
  }
  
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values({
      ...bookingData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<Booking | undefined> {
    const updatedBooking = await db.update(bookings)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
    
    return updatedBooking[0];
  }
  
  async assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined> {
    const updatedBooking = await db.update(bookings)
      .set({
        gurujiId,
        status: 'confirmed',
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    
    return updatedBooking[0];
  }

  // Payment Management
  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id));
    return result[0];
  }
  
  async getPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.bookingId, bookingId)).execute();
  }
  
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values({
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updatePaymentStatus(id: number, status: 'unpaid' | 'partial' | 'paid' | 'refunded'): Promise<Payment | undefined> {
    const updatedPayment = await db.update(payments)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(payments.id, id))
      .returning();
    
    return updatedPayment[0];
  }

  // Review Management
  async getReview(id: number): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    return result[0];
  }
  
  async getReviewsByGurujiId(gurujiId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.gurujiId, gurujiId)).execute();
  }
  
  async createReview(reviewData: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values({
      ...reviewData,
      createdAt: new Date()
    }).returning();
    
    // Update guruji profile with new rating
    await this.updateGurujiRating(reviewData.gurujiId);
    
    return result[0];
  }
  
  // Helper method to update guruji rating after a new review
  private async updateGurujiRating(gurujiId: number): Promise<void> {
    const reviews = await this.getReviewsByGurujiId(gurujiId);
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      await db.update(gurujiProfiles)
        .set({
          rating: averageRating,
          totalReviews: reviews.length,
          updatedAt: new Date()
        })
        .where(eq(gurujiProfiles.id, gurujiId));
    }
  }

  // Notification Management
  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).execute();
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values({
      ...notificationData,
      isRead: false,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({
        isRead: true
      })
      .where(eq(notifications.id, id));
    
    return !!result;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return !!result;
  }

  // Content Management
  async getContent(key: string): Promise<any | undefined> {
    const result = await db.select().from(contents).where(eq(contents.key, key));
    return result[0]?.content;
  }
  
  async updateContent(key: string, title: string, content: string): Promise<any | undefined> {
    // Check if content exists
    const existingContent = await db.select().from(contents).where(eq(contents.key, key));
    
    if (existingContent.length > 0) {
      // Update existing content
      const result = await db.update(contents)
        .set({
          title,
          content,
          updatedAt: new Date()
        })
        .where(eq(contents.key, key))
        .returning();
      
      return result[0]?.content;
    } else {
      // Create new content
      const result = await db.insert(contents)
        .values({
          key,
          title,
          content,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0]?.content;
    }
  }
}

// Export a singleton instance
export const pgStorage = new PgStorage();