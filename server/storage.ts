import { 
  users, User, InsertUser, otps, Otp, InsertOtp, 
  pujas, Puja, InsertPuja, bookings, Booking, InsertBooking,
  payments, Payment, InsertPayment, reviews, Review, InsertReview,
  gurujiProfiles, GurujiProfile, InsertGurujiProfile,
  notifications, Notification, InsertNotification,
  contents, promotionCodes,
  chatbotTemplates, ChatbotTemplate, InsertChatbotTemplate,
  chatbotTrainingData, ChatbotTrainingData, InsertChatbotTrainingData,
  whatsappUsers, WhatsappUser, InsertWhatsappUser,
  whatsappConversations, WhatsappConversation, InsertWhatsappConversation,
  whatsappMessages, WhatsappMessage, InsertWhatsappMessage,
  userJourneys, UserJourney, InsertUserJourney,
  userJourneyItems, UserJourneyItem, InsertUserJourneyItem,
  bookingRequests, BookingRequest, InsertBookingRequest
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
  getAllUsers(): Promise<User[]>; // For analytics

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
  getAllGurujiProfiles(): Promise<GurujiProfile[]>; // For analytics

  // Booking Management
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByCustomerId(customerId: number): Promise<Booking[]>;
  getBookingsByGurujiId(gurujiId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: 'pending' | 'pending_approval' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'): Promise<Booking | undefined>;
  
  // Booking Request Management
  createBookingRequest(bookingRequest: InsertBookingRequest): Promise<BookingRequest>;
  getBookingRequest(id: number): Promise<BookingRequest | undefined>;
  getBookingRequestsByBookingId(bookingId: number): Promise<BookingRequest[]>;
  getBookingRequestsByGurujiId(gurujiId: number): Promise<BookingRequest[]>;
  updateBookingRequestStatus(id: number, status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled', responseMessage?: string): Promise<BookingRequest | undefined>;
  expireOtherBookingRequests(bookingId: number, acceptedRequestId: number): Promise<boolean>;
  assignGurujiToBooking(bookingId: number, gurujiId: number): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>; // For analytics

  // Payment Management
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByBookingId(bookingId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: 'unpaid' | 'partial' | 'paid' | 'refunded'): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>; // For analytics

  // Review Management
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByGurujiId(gurujiId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  getAllReviews(): Promise<Review[]>; // For analytics

  // Notification Management
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  getAllNotifications(): Promise<Notification[]>; // For analytics

  // Content Management
  getContent(key: string): Promise<any | undefined>;
  updateContent(key: string, title: string, content: string): Promise<any | undefined>;
  
  // ChatBot Management
  getChatbotTemplates(): Promise<ChatbotTemplate[]>;
  createChatbotTemplate(template: InsertChatbotTemplate): Promise<ChatbotTemplate>;
  updateChatbotTemplate(id: number, template: Partial<ChatbotTemplate>): Promise<ChatbotTemplate | undefined>;
  deleteChatbotTemplate(id: number): Promise<boolean>;
  
  // ChatBot Training Data
  getChatbotTrainingData(): Promise<ChatbotTrainingData[]>;
  createChatbotTrainingData(data: InsertChatbotTrainingData): Promise<ChatbotTrainingData>;
  updateChatbotTrainingData(id: number, data: Partial<ChatbotTrainingData>): Promise<ChatbotTrainingData | undefined>;
  deleteChatbotTrainingData(id: number): Promise<boolean>;
  
  // WhatsApp User Management
  getChatbotUsers(): Promise<WhatsappUser[]>;
  getChatbotUserByWhatsappNumber(whatsappNumber: string): Promise<WhatsappUser | undefined>;
  linkUserWhatsapp(userId: number, whatsappNumber: string): Promise<WhatsappUser | undefined>;
  optOutUserWhatsapp(userId: number): Promise<WhatsappUser | undefined>;
  
  // WhatsApp Conversation Management
  getChatbotConversations(): Promise<WhatsappConversation[]>;
  getChatbotConversation(id: number): Promise<WhatsappConversation | undefined>;
  createChatbotConversation(data: InsertWhatsappConversation): Promise<WhatsappConversation>;
  updateChatbotConversationStatus(id: number, status: 'active' | 'closed'): Promise<WhatsappConversation | undefined>;
  
  // WhatsApp Message Management
  getChatbotMessages(conversationId: number): Promise<WhatsappMessage[]>;
  addChatbotMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  
  // User Journey Management
  getUserJourney(id: number): Promise<UserJourney | undefined>;
  getUserJourneyByUserId(userId: number): Promise<UserJourney | undefined>;
  createUserJourney(journey: InsertUserJourney): Promise<UserJourney>;
  updateUserJourney(id: number, journey: Partial<UserJourney>): Promise<UserJourney | undefined>;
  updateUserJourneyProgress(journeyId: number, completedPujas: number): Promise<UserJourney | undefined>;
  deleteUserJourney(id: number): Promise<boolean>;
  
  // User Journey Items Management
  getUserJourneyItem(id: number): Promise<UserJourneyItem | undefined>;
  getUserJourneyItemsByJourneyId(journeyId: number): Promise<UserJourneyItem[]>;
  createUserJourneyItem(item: InsertUserJourneyItem): Promise<UserJourneyItem>;
  updateUserJourneyItem(id: number, item: Partial<UserJourneyItem>): Promise<UserJourneyItem | undefined>;
  markUserJourneyItemComplete(id: number, reflection?: string): Promise<UserJourneyItem | undefined>;
  deleteUserJourneyItem(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private otps: Map<string, Otp>;
  private pujas: Map<number, Puja>;
  private gurujiProfiles: Map<number, GurujiProfile>;
  private bookings: Map<number, Booking>;
  private bookingRequests: Map<number, BookingRequest>;
  private payments: Map<number, Payment>;
  private reviews: Map<number, Review>;
  private notifications: Map<number, Notification>;
  private contents: Map<string, any>; // For configurable content like T&C
  private chatbotTemplates: Map<number, ChatbotTemplate>;
  private chatbotTrainingData: Map<number, ChatbotTrainingData>;
  private whatsappUsers: Map<number, WhatsappUser>;
  private whatsappConversations: Map<number, WhatsappConversation>;
  private whatsappMessages: Map<number, WhatsappMessage>;
  private userIdCounter: number;
  private otpIdCounter: number;
  private pujaIdCounter: number;
  private gurujiProfileIdCounter: number;
  private bookingIdCounter: number;
  private paymentIdCounter: number;
  private reviewIdCounter: number;
  private notificationIdCounter: number;
  private bookingRequestIdCounter: number;
  private chatbotTemplateIdCounter: number;
  private chatbotTrainingDataIdCounter: number;
  private whatsappUserIdCounter: number;
  private whatsappConversationIdCounter: number;
  private whatsappMessageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.otps = new Map();
    this.pujas = new Map();
    this.gurujiProfiles = new Map();
    this.bookings = new Map();
    this.bookingRequests = new Map();
    this.payments = new Map();
    this.reviews = new Map();
    this.notifications = new Map();
    this.contents = new Map();
    this.chatbotTemplates = new Map();
    this.chatbotTrainingData = new Map();
    this.whatsappUsers = new Map();
    this.whatsappConversations = new Map();
    this.whatsappMessages = new Map();
    this.userJourneys = new Map();
    this.userJourneyItems = new Map();
    this.userIdCounter = 1;
    this.otpIdCounter = 1;
    this.pujaIdCounter = 1;
    this.gurujiProfileIdCounter = 1;
    this.bookingIdCounter = 1;
    this.paymentIdCounter = 1;
    this.reviewIdCounter = 1;
    this.notificationIdCounter = 1;
    this.bookingRequestIdCounter = 1;
    this.chatbotTemplateIdCounter = 1;
    this.chatbotTrainingDataIdCounter = 1;
    this.whatsappUserIdCounter = 1;
    this.whatsappConversationIdCounter = 1;
    this.whatsappMessageIdCounter = 1;
    this.userJourneyIdCounter = 1;
    this.userJourneyItemIdCounter = 1;

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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
  
  async getAllGurujiProfiles(): Promise<GurujiProfile[]> {
    return Array.from(this.gurujiProfiles.values());
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
  
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
  
  // Booking Request Methods
  async createBookingRequest(bookingRequestData: InsertBookingRequest): Promise<BookingRequest> {
    const bookingRequest: BookingRequest = {
      ...bookingRequestData,
      id: this.bookingRequestIdCounter++,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      responseTime: undefined,
      penalty: 0
    };
    
    this.bookingRequests.set(bookingRequest.id, bookingRequest);
    return bookingRequest;
  }
  
  async getBookingRequest(id: number): Promise<BookingRequest | undefined> {
    return this.bookingRequests.get(id);
  }
  
  async getBookingRequestsByBookingId(bookingId: number): Promise<BookingRequest[]> {
    return Array.from(this.bookingRequests.values()).filter(
      (request) => request.bookingId === bookingId
    );
  }
  
  async getBookingRequestsByGurujiId(gurujiId: number): Promise<BookingRequest[]> {
    return Array.from(this.bookingRequests.values()).filter(
      (request) => request.gurujiId === gurujiId
    );
  }
  
  async updateBookingRequestStatus(
    id: number, 
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled', 
    responseMessage?: string
  ): Promise<BookingRequest | undefined> {
    const request = this.bookingRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      status,
      responseTime: new Date(),
      responseMessage: responseMessage || request.responseMessage,
      updatedAt: new Date()
    };
    
    this.bookingRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async expireOtherBookingRequests(bookingId: number, acceptedRequestId: number): Promise<boolean> {
    const requests = Array.from(this.bookingRequests.values()).filter(
      (request) => request.bookingId === bookingId && request.id !== acceptedRequestId
    );
    
    for (const request of requests) {
      const updatedRequest = {
        ...request,
        status: 'expired' as const,
        updatedAt: new Date()
      };
      this.bookingRequests.set(request.id, updatedRequest);
    }
    
    return true;
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
  
  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
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
  
  async getAllReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
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
  
  async getAllNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
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

  // ChatBot Template Management
  async getChatbotTemplates(): Promise<ChatbotTemplate[]> {
    return Array.from(this.chatbotTemplates.values());
  }

  async createChatbotTemplate(templateData: InsertChatbotTemplate): Promise<ChatbotTemplate> {
    const template: ChatbotTemplate = {
      ...templateData,
      id: this.chatbotTemplateIdCounter++,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.chatbotTemplates.set(template.id, template);
    return template;
  }

  async updateChatbotTemplate(id: number, templateData: Partial<ChatbotTemplate>): Promise<ChatbotTemplate | undefined> {
    const template = this.chatbotTemplates.get(id);
    if (!template) return undefined;

    const updatedTemplate = { ...template, ...templateData, updatedAt: new Date() };
    this.chatbotTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteChatbotTemplate(id: number): Promise<boolean> {
    return this.chatbotTemplates.delete(id);
  }

  // ChatBot Training Data Management
  async getChatbotTrainingData(): Promise<ChatbotTrainingData[]> {
    return Array.from(this.chatbotTrainingData.values());
  }

  async createChatbotTrainingData(data: InsertChatbotTrainingData): Promise<ChatbotTrainingData> {
    const trainingData: ChatbotTrainingData = {
      ...data,
      id: this.chatbotTrainingDataIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.chatbotTrainingData.set(trainingData.id, trainingData);
    return trainingData;
  }

  async updateChatbotTrainingData(id: number, data: Partial<ChatbotTrainingData>): Promise<ChatbotTrainingData | undefined> {
    const trainingData = this.chatbotTrainingData.get(id);
    if (!trainingData) return undefined;

    const updatedTrainingData = { ...trainingData, ...data, updatedAt: new Date() };
    this.chatbotTrainingData.set(id, updatedTrainingData);
    return updatedTrainingData;
  }

  async deleteChatbotTrainingData(id: number): Promise<boolean> {
    return this.chatbotTrainingData.delete(id);
  }

  // WhatsApp User Management
  async getChatbotUsers(): Promise<WhatsappUser[]> {
    return Array.from(this.whatsappUsers.values());
  }

  async getChatbotUserByWhatsappNumber(whatsappNumber: string): Promise<WhatsappUser | undefined> {
    return Array.from(this.whatsappUsers.values()).find(
      (user) => user.whatsappNumber === whatsappNumber
    );
  }

  async linkUserWhatsapp(userId: number, whatsappNumber: string): Promise<WhatsappUser | undefined> {
    const existingUser = await this.getChatbotUserByWhatsappNumber(whatsappNumber);
    
    if (existingUser) {
      // Update the existing user
      const updatedUser: WhatsappUser = {
        ...existingUser,
        userId,
        isVerified: true,
        isOptedIn: true,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.whatsappUsers.set(existingUser.id, updatedUser);
      return updatedUser;
    } else {
      // Create a new WhatsApp user
      const newUser: WhatsappUser = {
        id: this.whatsappUserIdCounter++,
        userId,
        whatsappNumber,
        isVerified: true,
        isOptedIn: true,
        lastInteractionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.whatsappUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  async optOutUserWhatsapp(userId: number): Promise<WhatsappUser | undefined> {
    const whatsappUser = Array.from(this.whatsappUsers.values()).find(
      (user) => user.userId === userId
    );
    
    if (!whatsappUser) return undefined;
    
    const updatedUser: WhatsappUser = {
      ...whatsappUser,
      isOptedIn: false,
      updatedAt: new Date(),
    };
    
    this.whatsappUsers.set(whatsappUser.id, updatedUser);
    return updatedUser;
  }

  // WhatsApp Conversation Management
  async getChatbotConversations(): Promise<WhatsappConversation[]> {
    return Array.from(this.whatsappConversations.values());
  }

  async getChatbotConversation(id: number): Promise<WhatsappConversation | undefined> {
    return this.whatsappConversations.get(id);
  }

  async createChatbotConversation(data: InsertWhatsappConversation): Promise<WhatsappConversation> {
    const conversation: WhatsappConversation = {
      ...data,
      id: this.whatsappConversationIdCounter++,
      isActive: true,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.whatsappConversations.set(conversation.id, conversation);
    return conversation;
  }

  async updateChatbotConversationStatus(id: number, status: 'active' | 'closed'): Promise<WhatsappConversation | undefined> {
    const conversation = this.whatsappConversations.get(id);
    if (!conversation) return undefined;

    const updatedConversation: WhatsappConversation = {
      ...conversation,
      isActive: status === 'active',
      updatedAt: new Date(),
    };

    this.whatsappConversations.set(id, updatedConversation);
    return updatedConversation;
  }

  // WhatsApp Message Management
  async getChatbotMessages(conversationId: number): Promise<WhatsappMessage[]> {
    return Array.from(this.whatsappMessages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async addChatbotMessage(messageData: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const message: WhatsappMessage = {
      ...messageData,
      id: this.whatsappMessageIdCounter++,
      isDelivered: messageData.direction === 'outbound', // Mark outbound messages as delivered
      isRead: false,
      createdAt: new Date(),
    };

    this.whatsappMessages.set(message.id, message);
    
    // Update the conversation's lastMessageAt timestamp
    const conversation = this.whatsappConversations.get(message.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();
      this.whatsappConversations.set(conversation.id, conversation);
    }
    
    return message;
  }

  // User Journey properties and counters
  private userJourneys: Map<number, UserJourney> = new Map();
  private userJourneyItems: Map<number, UserJourneyItem> = new Map();
  private userJourneyIdCounter: number = 1;
  private userJourneyItemIdCounter: number = 1;

  // User Journey Management
  async getUserJourney(id: number): Promise<UserJourney | undefined> {
    return this.userJourneys.get(id);
  }

  async getUserJourneyByUserId(userId: number): Promise<UserJourney | undefined> {
    return Array.from(this.userJourneys.values()).find(
      (journey) => journey.userId === userId
    );
  }

  async createUserJourney(journeyData: InsertUserJourney): Promise<UserJourney> {
    const journey: UserJourney = {
      ...journeyData,
      id: this.userJourneyIdCounter++,
      stage: 'beginner',
      totalPujas: 0,
      completedPujas: 0,
      description: journeyData.description || null,
      goals: journeyData.goals || null,
      achievements: journeyData.achievements || null,
      nextRecommendation: journeyData.nextRecommendation || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.userJourneys.set(journey.id, journey);
    return journey;
  }

  async updateUserJourney(id: number, journeyData: Partial<UserJourney>): Promise<UserJourney | undefined> {
    const journey = this.userJourneys.get(id);
    if (!journey) return undefined;

    const updatedJourney = { ...journey, ...journeyData, updatedAt: new Date() };
    this.userJourneys.set(id, updatedJourney);
    return updatedJourney;
  }

  async updateUserJourneyProgress(journeyId: number, completedPujas: number): Promise<UserJourney | undefined> {
    const journey = this.userJourneys.get(journeyId);
    if (!journey) return undefined;

    // Calculate new stage based on progress
    let newStage = journey.stage;
    const totalPujas = journey.totalPujas || 0;
    const completionRate = completedPujas / Math.max(totalPujas, 1);
    
    if (completionRate >= 0.9 && totalPujas >= 20) {
      newStage = 'master';
    } else if (completionRate >= 0.75 && totalPujas >= 15) {
      newStage = 'expert';
    } else if (completionRate >= 0.5 && totalPujas >= 10) {
      newStage = 'advanced';
    } else if (completionRate >= 0.25 && totalPujas >= 5) {
      newStage = 'intermediate';
    }

    const updatedJourney = { 
      ...journey, 
      completedPujas, 
      stage: newStage, 
      updatedAt: new Date() 
    };
    
    this.userJourneys.set(journeyId, updatedJourney);
    return updatedJourney;
  }

  async deleteUserJourney(id: number): Promise<boolean> {
    return this.userJourneys.delete(id);
  }
  
  // User Journey Items Management
  async getUserJourneyItem(id: number): Promise<UserJourneyItem | undefined> {
    return this.userJourneyItems.get(id);
  }

  async getUserJourneyItemsByJourneyId(journeyId: number): Promise<UserJourneyItem[]> {
    return Array.from(this.userJourneyItems.values())
      .filter(item => item.journeyId === journeyId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async createUserJourneyItem(itemData: InsertUserJourneyItem): Promise<UserJourneyItem> {
    const item: UserJourneyItem = {
      ...itemData,
      id: this.userJourneyItemIdCounter++,
      isCompleted: false,
      completedAt: null,
      description: itemData.description || null,
      pujaId: itemData.pujaId || null,
      bookingId: itemData.bookingId || null,
      reflection: itemData.reflection || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.userJourneyItems.set(item.id, item);
    
    // Update total pujas count in the journey
    const journey = this.userJourneys.get(item.journeyId);
    if (journey) {
      const totalPujas = (journey.totalPujas || 0) + 1;
      journey.totalPujas = totalPujas;
      this.userJourneys.set(journey.id, journey);
    }
    
    return item;
  }

  async updateUserJourneyItem(id: number, itemData: Partial<UserJourneyItem>): Promise<UserJourneyItem | undefined> {
    const item = this.userJourneyItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...itemData, updatedAt: new Date() };
    this.userJourneyItems.set(id, updatedItem);
    return updatedItem;
  }

  async markUserJourneyItemComplete(id: number, reflection?: string): Promise<UserJourneyItem | undefined> {
    const item = this.userJourneyItems.get(id);
    if (!item) return undefined;

    // Only mark as complete if it wasn't already completed
    const wasAlreadyCompleted = item.isCompleted;
    
    const updatedItem: UserJourneyItem = {
      ...item,
      isCompleted: true,
      completedAt: new Date(),
      reflection: reflection || item.reflection,
      updatedAt: new Date(),
    };
    
    this.userJourneyItems.set(id, updatedItem);
    
    // Update journey progress if this is newly completed
    if (!wasAlreadyCompleted) {
      const journey = this.userJourneys.get(item.journeyId);
      if (journey) {
        const completedPujas = (journey.completedPujas || 0) + 1;
        await this.updateUserJourneyProgress(journey.id, completedPujas);
      }
    }
    
    return updatedItem;
  }

  async deleteUserJourneyItem(id: number): Promise<boolean> {
    const item = this.userJourneyItems.get(id);
    if (!item) return false;
    
    // Update total pujas count in the journey
    const journey = this.userJourneys.get(item.journeyId);
    if (journey) {
      const totalPujas = Math.max(0, (journey.totalPujas || 0) - 1);
      journey.totalPujas = totalPujas;
      
      // If the item was completed, also decrease the completed count
      if (item.isCompleted) {
        const completedPujas = Math.max(0, (journey.completedPujas || 0) - 1);
        journey.completedPujas = completedPujas;
      }
      
      this.userJourneys.set(journey.id, journey);
    }
    
    return this.userJourneyItems.delete(id);
  }
}

// Import the PostgreSQL storage implementation
import { pgStorage } from './pgStorage';

// Swap to PostgreSQL storage implementation
// Use pgStorage for real database
// Import our new implementation that uses direct SQL queries
import { dbStorage } from './dbStorage';

export const storage = dbStorage;
