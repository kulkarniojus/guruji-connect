import { 
  users, User, InsertUser, otps, Otp, InsertOtp, 
  pujas, Puja, InsertPuja, bookings, Booking, InsertBooking,
  payments, Payment, InsertPayment, reviews, Review, InsertReview,
  gurujiProfiles, GurujiProfile, InsertGurujiProfile,
  notifications, Notification, InsertNotification,
  contents, promotionCodes
} from "@shared/schema";
import { eq, and, like, or, lt, gt, gte, desc, inArray } from "drizzle-orm";
import { genSalt, hash, compare } from "bcrypt";

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  blockUser(id: number): Promise<boolean>;
  unblockUser(id: number): Promise<boolean>;
  verifyPassword(userId: number, password: string): Promise<boolean>;
  changePassword(userId: number, newPassword: string): Promise<boolean>;

  // OTP Management
  createOtp(otp: InsertOtp): Promise<Otp>;
  getOtpByMobile(mobile: string): Promise<Otp | undefined>;
  verifyOtp(mobile: string, otp: string): Promise<boolean>;
  deleteOtp(mobile: string): Promise<boolean>;

  // Puja Management
  getPuja(id: number): Promise<Puja | undefined>;
  getAllPujas(): Promise<Puja[]>;
  createPuja(puja: InsertPuja): Promise<Puja>;
  updatePuja(id: number, puja: Partial<Puja>): Promise<Puja | undefined>;
  deletePuja(id: number): Promise<boolean>;
  searchPujas(query: string): Promise<Puja[]>;

  // Guruji Profile Management
  getGurujiProfile(id: number): Promise<GurujiProfile | undefined>;
  getGurujiProfileByUserId(userId: number): Promise<GurujiProfile | undefined>;
  createGurujiProfile(profile: InsertGurujiProfile): Promise<GurujiProfile>;
  updateGurujiProfile(id: number, profile: Partial<GurujiProfile>): Promise<GurujiProfile | undefined>;
  getNearbyGurujis(city: string, pujaId?: number, radius?: number): Promise<GurujiProfile[]>;

  // Booking Management
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByCustomerId(customerId: number): Promise<Booking[]>;
  getBookingsByGurujiId(gurujiId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<Booking | undefined>;
  assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined>;

  // Payment Management
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByBookingId(bookingId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: 'unpaid' | 'partial' | 'paid' | 'refunded'): Promise<Payment | undefined>;

  // Review Management
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByGurujiId(gurujiId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Notification Management
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Content Management
  getContent(key: string): Promise<any | undefined>;
  updateContent(key: string, title: string, content: string): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private otps: Map<string, Otp>;
  private pujas: Map<number, Puja>;
  private gurujiProfiles: Map<number, GurujiProfile>;
  private bookings: Map<number, Booking>;
  private payments: Map<number, Payment>;
  private reviews: Map<number, Review>;
  private notifications: Map<number, Notification>;
  private contents: Map<string, any>; // For configurable content like T&C
  private userIdCounter: number;
  private otpIdCounter: number;
  private pujaIdCounter: number;
  private gurujiProfileIdCounter: number;
  private bookingIdCounter: number;
  private paymentIdCounter: number;
  private reviewIdCounter: number;
  private notificationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.otps = new Map();
    this.pujas = new Map();
    this.gurujiProfiles = new Map();
    this.bookings = new Map();
    this.payments = new Map();
    this.reviews = new Map();
    this.notifications = new Map();
    this.contents = new Map();
    this.userIdCounter = 1;
    this.otpIdCounter = 1;
    this.pujaIdCounter = 1;
    this.gurujiProfileIdCounter = 1;
    this.bookingIdCounter = 1;
    this.paymentIdCounter = 1;
    this.reviewIdCounter = 1;
    this.notificationIdCounter = 1;

    // Initialize with some default content
    this.contents.set('customer_terms', {
      key: 'customer_terms',
      title: 'Terms and Conditions for Customers',
      content: 'These are the terms and conditions for customers.',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    this.contents.set('guruji_terms', {
      key: 'guruji_terms',
      title: 'Terms and Conditions for Gurujis',
      content: 'These are the terms and conditions for Gurujis.',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize with some default pujas
    this.initializeDefaultPujas();
  }

  private initializeDefaultPujas() {
    const defaultPujas = [
      {
        id: this.pujaIdCounter++,
        name: 'Satyanarayan Puja',
        description: 'A puja dedicated to Lord Vishnu, performed for prosperity and well-being of the family.',
        price: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1602602444238-8a75da8578c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        type: 'offline',
        duration: 120, // 2 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.pujaIdCounter++,
        name: 'Ganesh Puja',
        description: 'A ceremony to worship Lord Ganesha, performed for removing obstacles and bringing good fortune.',
        price: 1200,
        imageUrl: 'https://images.unsplash.com/photo-1602989372721-7d65d54a74ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        type: 'offline',
        duration: 90, // 1.5 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.pujaIdCounter++,
        name: 'Griha Pravesh',
        description: 'A housewarming ceremony performed before entering a new home to invoke positive energy and blessings.',
        price: 2500,
        imageUrl: 'https://images.unsplash.com/photo-1599946347960-dbf2caca5ba5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        type: 'offline',
        duration: 180, // 3 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.pujaIdCounter++,
        name: 'Navgraha Shanti',
        description: 'A puja to pacify the nine planets and seek their blessings to remove obstacles in life.',
        price: 1800,
        imageUrl: 'https://images.unsplash.com/photo-1617473346681-58383870ca6a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        type: 'online',
        duration: 120, // 2 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const puja of defaultPujas) {
      this.pujas.set(puja.id, puja as Puja);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash the password
    const salt = await genSalt(10);
    const hashedPassword = await hash(userData.password, salt);

    const user: User = {
      ...userData,
      id: this.userIdCounter++,
      password: hashedPassword,
      isVerified: false,
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async blockUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.isBlocked = true;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return true;
  }

  async unblockUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.isBlocked = false;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return true;
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    return compare(password, user.password);
  }

  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const salt = await genSalt(10);
    const hashedPassword = await hash(newPassword, salt);
    
    user.password = hashedPassword;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return true;
  }

  async createOtp(otpData: InsertOtp): Promise<Otp> {
    const otp: Otp = {
      ...otpData,
      id: this.otpIdCounter++,
      createdAt: new Date(),
    };

    // Delete any existing OTPs for this mobile
    const existingOtps = Array.from(this.otps.values()).filter(
      (o) => o.mobile === otpData.mobile
    );
    
    for (const existingOtp of existingOtps) {
      this.otps.delete(existingOtp.mobile);
    }

    this.otps.set(otp.mobile, otp);
    return otp;
  }

  async getOtpByMobile(mobile: string): Promise<Otp | undefined> {
    return this.otps.get(mobile);
  }

  async verifyOtp(mobile: string, otpValue: string): Promise<boolean> {
    const otp = this.otps.get(mobile);
    if (!otp) return false;

    if (otp.otp !== otpValue) return false;
    
    // Check if OTP is expired
    if (otp.expiresAt < new Date()) {
      this.otps.delete(mobile);
      return false;
    }
    
    // OTP verified, delete it
    this.otps.delete(mobile);
    return true;
  }

  async deleteOtp(mobile: string): Promise<boolean> {
    return this.otps.delete(mobile);
  }

  async getPuja(id: number): Promise<Puja | undefined> {
    return this.pujas.get(id);
  }

  async getAllPujas(): Promise<Puja[]> {
    return Array.from(this.pujas.values());
  }

  async createPuja(pujaData: InsertPuja): Promise<Puja> {
    const puja: Puja = {
      ...pujaData,
      id: this.pujaIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pujas.set(puja.id, puja);
    return puja;
  }

  async updatePuja(id: number, pujaData: Partial<Puja>): Promise<Puja | undefined> {
    const puja = this.pujas.get(id);
    if (!puja) return undefined;

    const updatedPuja = { ...puja, ...pujaData, updatedAt: new Date() };
    this.pujas.set(id, updatedPuja);
    return updatedPuja;
  }

  async deletePuja(id: number): Promise<boolean> {
    return this.pujas.delete(id);
  }

  async searchPujas(query: string): Promise<Puja[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.pujas.values()).filter(
      (puja) => 
        puja.name.toLowerCase().includes(lowercaseQuery) || 
        puja.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getGurujiProfile(id: number): Promise<GurujiProfile | undefined> {
    return this.gurujiProfiles.get(id);
  }

  async getGurujiProfileByUserId(userId: number): Promise<GurujiProfile | undefined> {
    return Array.from(this.gurujiProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }

  async createGurujiProfile(profileData: InsertGurujiProfile): Promise<GurujiProfile> {
    const profile: GurujiProfile = {
      ...profileData,
      id: this.gurujiProfileIdCounter++,
      rating: 0,
      totalReviews: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.gurujiProfiles.set(profile.id, profile);
    return profile;
  }

  async updateGurujiProfile(id: number, profileData: Partial<GurujiProfile>): Promise<GurujiProfile | undefined> {
    const profile = this.gurujiProfiles.get(id);
    if (!profile) return undefined;

    const updatedProfile = { ...profile, ...profileData, updatedAt: new Date() };
    this.gurujiProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  async getNearbyGurujis(city: string, pujaId?: number, radius: number = 10): Promise<GurujiProfile[]> {
    // In a real implementation, this would use geolocation data
    // For this memory storage, we'll just filter by city
    return Array.from(this.gurujiProfiles.values()).filter(
      (profile) => 
        profile.location.toLowerCase().includes(city.toLowerCase()) && 
        (profile.radius >= radius) &&
        !profile.isBlocked
    );
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.customerId === customerId
    );
  }

  async getBookingsByGurujiId(gurujiId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.gurujiId === gurujiId
    );
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const booking: Booking = {
      ...bookingData,
      id: this.bookingIdCounter++,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bookings.set(booking.id, booking);
    return booking;
  }

  async updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    booking.status = status;
    booking.updatedAt = new Date();
    this.bookings.set(id, booking);
    return booking;
  }

  async assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined> {
    const booking = this.bookings.get(bookingId);
    if (!booking) return undefined;

    booking.gurujiId = gurujiId;
    booking.status = 'confirmed';
    booking.updatedAt = new Date();
    this.bookings.set(bookingId, booking);
    return booking;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByBookingId(bookingId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.bookingId === bookingId
    );
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const payment: Payment = {
      ...paymentData,
      id: this.paymentIdCounter++,
      status: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.payments.set(payment.id, payment);
    return payment;
  }

  async updatePaymentStatus(id: number, status: 'unpaid' | 'partial' | 'paid' | 'refunded'): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;

    payment.status = status;
    payment.updatedAt = new Date();
    this.payments.set(id, payment);
    return payment;
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsByGurujiId(gurujiId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.gurujiId === gurujiId
    );
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const review: Review = {
      ...reviewData,
      id: this.reviewIdCounter++,
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);

    // Update guruji rating
    const gurujiProfile = this.gurujiProfiles.get(review.gurujiId);
    if (gurujiProfile) {
      const gurujiReviews = await this.getReviewsByGurujiId(review.gurujiId);
      const totalRating = gurujiReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Math.round(totalRating / gurujiReviews.length);
      
      gurujiProfile.rating = avgRating;
      gurujiProfile.totalReviews = gurujiReviews.length;
      gurujiProfile.updatedAt = new Date();
      
      this.gurujiProfiles.set(gurujiProfile.id, gurujiProfile);
    }

    return review;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      ...notificationData,
      id: this.notificationIdCounter++,
      isRead: false,
      createdAt: new Date(),
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async getContent(key: string): Promise<any | undefined> {
    return this.contents.get(key);
  }

  async updateContent(key: string, title: string, content: string): Promise<any | undefined> {
    const existingContent = this.contents.get(key);
    
    const updatedContent = {
      key,
      title,
      content,
      createdAt: existingContent ? existingContent.createdAt : new Date(),
      updatedAt: new Date()
    };
    
    this.contents.set(key, updatedContent);
    return updatedContent;
  }
}

export const storage = new MemStorage();
