import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['customer', 'guruji', 'admin']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partial', 'paid', 'refunded']);
export const pujaTypeEnum = pgEnum('puja_type', ['offline', 'online']);
export const consultationType = pgEnum('consultation_type', ['own_guruji', 'auto_select', 'immediate']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  mobile: text("mobile").notNull().unique(),
  password: text("password").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  role: userRoleEnum("role").notNull(),
  // Address details
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  // Identity details
  aadhar: text("aadhar"),
  caste: text("caste"),
  isVerified: boolean("is_verified").default(false),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP table
export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pujas table
export const pujas = pgTable("pujas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: integer("basePrice").notNull(),
  price: integer("price"),
  imageUrl: text("imageUrl"),
  items: text("items").array(),
  isPopular: boolean("isPopular").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  type: pujaTypeEnum("type").notNull(),
  duration: integer("duration").notNull(), // in minutes
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

// Guruji profile table
export const gurujiProfiles = pgTable("guruji_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bio: text("bio"),
  experience: integer("experience"), // in years
  specialization: text("specialization"),
  // Service availability
  location: text("location").notNull(),
  radius: integer("radius").default(20), // in km - increased from 10km to 20km
  pricePerHour: integer("price_per_hour").default(500), // Base price for consultation
  isOnline: boolean("is_online").default(false),
  isOffline: boolean("is_offline").default(true),
  isConsultation: boolean("is_consultation").default(false),
  isAvailable: boolean("is_available").default(true),
  // Verification details
  aadharVerified: boolean("aadhar_verified").default(false),
  documentsVerified: boolean("documents_verified").default(false),
  verificationDate: timestamp("verification_date"),
  // Ratings and reviews
  rating: integer("rating").default(0),
  totalReviews: integer("total_reviews").default(0),
  // Additional profile details
  languages: text("languages").array(),
  certificates: text("certificates").array(),
  profilePictureUrl: text("profile_picture_url"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guruji pujas table (Many-to-Many relationship)
export const gurujiPujas = pgTable("guruji_pujas", {
  id: serial("id").primaryKey(),
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  pujaId: integer("puja_id").notNull().references(() => pujas.id),
  price: integer("price"), // Custom price if different from standard
  createdAt: timestamp("created_at").defaultNow(),
});

// Guruji groups table
export const gurujiGroups = pgTable("guruji_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  adminId: integer("admin_id").notNull().references(() => gurujiProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guruji group members table
export const gurujiGroupMembers = pgTable("guruji_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => gurujiGroups.id),
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => users.id),
  gurujiId: integer("guruji_id").references(() => gurujiProfiles.id),
  pujaId: integer("puja_id").references(() => pujas.id),
  status: bookingStatusEnum("status").notNull().default('pending'),
  type: pujaTypeEnum("type").notNull(),
  consultationType: consultationType("consultation_type"),
  amount: integer("amount").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  isImmediate: boolean("is_immediate").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").notNull().default('unpaid'),
  transactionId: text("transaction_id"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  customerId: integer("customer_id").notNull().references(() => users.id),
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Content table (for configurable content like T&C)
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promotion codes table
export const promotionCodes = pgTable("promotion_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercentage: integer("discount_percentage").notNull(),
  maxDiscount: integer("max_discount"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  isBlocked: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtpSchema = createInsertSchema(otps).omit({
  id: true,
  createdAt: true,
});

export const insertPujaSchema = createInsertSchema(pujas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGurujiProfileSchema = createInsertSchema(gurujiProfiles).omit({
  id: true,
  rating: true,
  totalReviews: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Otp = typeof otps.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;

export type Puja = typeof pujas.$inferSelect;
export type InsertPuja = z.infer<typeof insertPujaSchema>;

export type GurujiProfile = typeof gurujiProfiles.$inferSelect;
export type InsertGurujiProfile = z.infer<typeof insertGurujiProfileSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
