import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb, primaryKey } from "drizzle-orm/pg-core";
import type { PricingQuote } from './pujaPricing';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['customer', 'guruji', 'admin', 'sales_rep']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'pending_approval', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partial', 'paid', 'refunded']);
export const pujaTypeEnum = pgEnum('puja_type', ['offline', 'online']);
export const consultationType = pgEnum('consultation_type', ['own_guruji', 'auto_select', 'immediate']);
export const videoSessionStatusEnum = pgEnum('video_session_status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'missed']);
export const chatbotIntentEnum = pgEnum('chatbot_intent', ['greeting', 'booking_inquiry', 'puja_information', 'guruji_availability', 'payment_issue', 'cancel_booking', 'reschedule_booking', 'general_inquiry', 'technical_support', 'other']);
export const journeyStageEnum = pgEnum('journey_stage', ['beginner', 'intermediate', 'advanced', 'expert', 'master']);
export const gurujiStatusEnum = pgEnum('guruji_status', ['pending', 'approved', 'rejected', 'suspended']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'accepted', 'rejected', 'expired']);

// Cities table - for admin-configurable cities
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  dob: text("dob"),
  caste: text("caste"),
  photoUrl: text("photo_url"),
  registeredBy: integer("registered_by"),
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
  // Approval workflow
  status: gurujiStatusEnum("status").notNull().default('pending'),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  // Additional required fields
  cities: text("cities").array(), // Array of city IDs they serve
  maxCities: integer("max_cities").default(2),
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
  pricingSnapshot: jsonb("pricing_snapshot").$type<PricingQuote>(),
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

// Reviews table — supports both customer→guruji and guruji→customer ratings
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull().references(() => bookings.id),
  customerId: integer("customerId").notNull().references(() => users.id),
  gurujiId: integer("gurujiId").notNull().references(() => gurujiProfiles.id),
  fromRole: text("from_role").notNull().default('customer'), // 'customer' | 'guruji'
  rating: integer("rating").notNull(),
  review: text("comment"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Booking Request Status Enum
export const requestStatusEnum = pgEnum('request_status', ['pending', 'accepted', 'declined', 'expired', 'cancelled']);

// Booking Requests table - for tracking booking requests sent to gurujis
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  status: requestStatusEnum("status").notNull().default('pending'),
  responseTime: timestamp("response_time"),
  responseMessage: text("response_message"),
  cancellationReason: text("cancellation_reason"),
  penalty: integer("penalty").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Booking Queries table - customer questions to admin about a booking
export const bookingQueries = pgTable("booking_queries", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  customerId: integer("customer_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  adminReply: text("admin_reply"),
  repliedBy: integer("replied_by").references(() => users.id),
  repliedAt: timestamp("replied_at"),
  status: text("status").notNull().default('open'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingQuerySchema = createInsertSchema(bookingQueries).omit({
  id: true, adminReply: true, repliedBy: true, repliedAt: true, status: true, createdAt: true,
});
export type InsertBookingQuery = z.infer<typeof insertBookingQuerySchema>;
export type BookingQuery = typeof bookingQueries.$inferSelect;

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

// Booking notifications table - tracks which gurujis are notified about bookings
export const bookingNotifications = pgTable("booking_notifications", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  status: notificationStatusEnum("status").notNull().default('sent'),
  notifiedAt: timestamp("notified_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Video conference sessions table
export const videoConferences = pgTable("video_conferences", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  roomId: text("room_id").notNull(),
  status: videoSessionStatusEnum("status").notNull().default('scheduled'),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes, calculated after session ends
  gurujiId: integer("guruji_id").notNull().references(() => gurujiProfiles.id),
  customerId: integer("customer_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp user table - to associate WhatsApp numbers with system users
export const whatsappUsers = pgTable("whatsapp_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  isVerified: boolean("is_verified").default(false),
  isOptedIn: boolean("is_opted_in").default(true),
  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp conversations table
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  whatsappUserId: integer("whatsapp_user_id").notNull().references(() => whatsappUsers.id),
  isActive: boolean("is_active").default(true),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  contextData: jsonb("context_data"), // Store conversation context as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp messages table
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => whatsappConversations.id),
  direction: text("direction").notNull(), // "inbound" or "outbound"
  messageContent: text("message_content").notNull(),
  mediaUrl: text("media_url"), // For attachments, photos, etc.
  isDelivered: boolean("is_delivered").default(false),
  isRead: boolean("is_read").default(false),
  messageId: text("message_id"), // WhatsApp message ID for tracking
  intent: chatbotIntentEnum("intent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ChatBot templates table - for predefined WhatsApp message templates
export const chatbotTemplates = pgTable("chatbot_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  content: text("content").notNull(),
  intent: chatbotIntentEnum("intent").notNull(),
  variables: text("variables").array(), // Placeholders in the template
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ChatBot training data table - for NLP model training
export const chatbotTrainingData = pgTable("chatbot_training_data", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  intent: chatbotIntentEnum("intent").notNull(),
  entities: jsonb("entities"), // Named entities in the training data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User journey progress table
export const userJourneys = pgTable("user_journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  stage: journeyStageEnum("stage").notNull().default('beginner'),
  totalPujas: integer("total_pujas").default(0),
  completedPujas: integer("completed_pujas").default(0),
  goals: jsonb("goals"), // Array of spiritual goals
  achievements: jsonb("achievements"), // Unlocked achievements
  nextRecommendation: integer("next_recommendation").references(() => pujas.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Journey Items table - records each step in a user's journey
export const userJourneyItems = pgTable("user_journey_items", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").notNull().references(() => userJourneys.id),
  pujaId: integer("puja_id").references(() => pujas.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  title: text("title").notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  reflection: text("reflection"), // User's notes/reflections after completing this item
  sequence: integer("sequence").notNull(), // Order in the journey
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  pricingSnapshot: true,
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

export const insertVideoConferenceSchema = createInsertSchema(videoConferences).omit({
  id: true,
  status: true,
  actualStartTime: true,
  endTime: true,
  duration: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappUserSchema = createInsertSchema(whatsappUsers).omit({
  id: true,
  isVerified: true,
  lastInteractionAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({
  id: true,
  isActive: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  isDelivered: true,
  isRead: true,
  createdAt: true,
});

export const insertChatbotTemplateSchema = createInsertSchema(chatbotTemplates).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotTrainingDataSchema = createInsertSchema(chatbotTrainingData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserJourneySchema = createInsertSchema(userJourneys).omit({
  id: true,
  stage: true,
  totalPujas: true,
  completedPujas: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserJourneyItemSchema = createInsertSchema(userJourneyItems).omit({
  id: true,
  isCompleted: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
// The price snapshot is generated by the server, never accepted from a customer.
export type InsertBooking = z.infer<typeof insertBookingSchema> & { pricingSnapshot?: PricingQuote | null };

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type VideoConference = typeof videoConferences.$inferSelect;
export type InsertVideoConference = z.infer<typeof insertVideoConferenceSchema>;

export type WhatsappUser = typeof whatsappUsers.$inferSelect;
export type InsertWhatsappUser = z.infer<typeof insertWhatsappUserSchema>;

export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

export type ChatbotTemplate = typeof chatbotTemplates.$inferSelect;
export type InsertChatbotTemplate = z.infer<typeof insertChatbotTemplateSchema>;

export type ChatbotTrainingData = typeof chatbotTrainingData.$inferSelect;
export type InsertChatbotTrainingData = z.infer<typeof insertChatbotTrainingDataSchema>;

export type UserJourney = typeof userJourneys.$inferSelect;
export type InsertUserJourney = z.infer<typeof insertUserJourneySchema>;

export type UserJourneyItem = typeof userJourneyItems.$inferSelect;
export type InsertUserJourneyItem = z.infer<typeof insertUserJourneyItemSchema>;

export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;

// App settings table — single-row config managed by admin
// Cancellation rules table — admin-defined rules for guruji and customer cancellations
export const cancellationRules = pgTable("cancellation_rules", {
  id: serial("id").primaryKey(),
  userType: text("user_type").notNull(), // 'guruji' | 'customer'
  name: text("name").notNull(),
  hoursThreshold: integer("hours_threshold").notNull(), // cancel must happen AT LEAST this many hours before booking
  chargeType: text("charge_type").notNull(), // 'free' | 'percentage' | 'fixed' | 'full'
  chargeValue: integer("charge_value").default(0), // % or fixed ₹ amount (0 for free/full)
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCancellationRuleSchema = createInsertSchema(cancellationRules).omit({ id: true, createdAt: true });
export type CancellationRule = typeof cancellationRules.$inferSelect;
export type InsertCancellationRule = z.infer<typeof insertCancellationRuleSchema>;

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  paymentRequired: boolean("payment_required").notNull().default(false),
  upiId: text("upi_id"),
  upiName: text("upi_name"),
  upiQrImageUrl: text("upi_qr_image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

// Add schema and types for booking requests
export const insertBookingRequestSchema = createInsertSchema(bookingRequests).omit({
  id: true,
  status: true,
  responseTime: true,
  penalty: true,
  createdAt: true,
  updatedAt: true,
});

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = z.infer<typeof insertBookingRequestSchema>;

export const bookingCompletionChallenges = pgTable('booking_completion_challenges', {
  bookingId: integer('booking_id').primaryKey().references(() => bookings.id, { onDelete: 'cascade' }),
  codeCipher: text('code_cipher'),
  otpDigest: text('otp_digest'),
  requestedAt: timestamp('requested_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completionMethod: text('completion_method'),
  adminSharedWithGurujiAt: timestamp('admin_shared_with_guruji_at', { withTimezone: true }),
});

export const bookingAddressReleases = pgTable('booking_address_releases', {
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  gurujiUserId: integer('guruji_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  releasedAt: timestamp('released_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({ pk: primaryKey({ columns: [table.bookingId, table.gurujiUserId] }) }));

export const bookingCommunications = pgTable('booking_communications', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  recipientUserId: integer('recipient_user_id').references(() => users.id, { onDelete: 'set null' }),
  recipientRole: text('recipient_role').notNull(),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookingCompletionEvents = pgTable('booking_completion_events', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
