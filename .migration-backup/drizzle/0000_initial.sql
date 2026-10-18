-- Create enum types
CREATE TYPE "user_role" AS ENUM ('customer', 'guruji', 'admin');
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE "puja_type" AS ENUM ('offline', 'online');
CREATE TYPE "consultation_type" AS ENUM ('own_guruji', 'auto_select', 'immediate');

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "first_name" VARCHAR NOT NULL,
  "last_name" VARCHAR NOT NULL,
  "email" VARCHAR NOT NULL UNIQUE,
  "mobile" VARCHAR NOT NULL UNIQUE,
  "password" VARCHAR NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" VARCHAR NOT NULL,
  "role" user_role NOT NULL,
  "aadhar" VARCHAR,
  "caste" VARCHAR,
  "is_verified" BOOLEAN DEFAULT FALSE,
  "is_blocked" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "otps" (
  "id" SERIAL PRIMARY KEY,
  "mobile" VARCHAR NOT NULL,
  "otp" VARCHAR NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pujas" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "type" puja_type NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "duration" INTEGER NOT NULL,
  "image_url" VARCHAR,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "guruji_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "bio" TEXT,
  "experience" INTEGER,
  "specialization" VARCHAR,
  "location" VARCHAR NOT NULL,
  "radius" INTEGER DEFAULT 10,
  "is_online" BOOLEAN DEFAULT FALSE,
  "is_offline" BOOLEAN DEFAULT TRUE,
  "is_consultation" BOOLEAN DEFAULT FALSE,
  "rating" INTEGER DEFAULT 0,
  "total_reviews" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "guruji_pujas" (
  "id" SERIAL PRIMARY KEY,
  "guruji_id" INTEGER NOT NULL REFERENCES "guruji_profiles"("id"),
  "puja_id" INTEGER NOT NULL REFERENCES "pujas"("id"),
  "price" INTEGER,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "guruji_groups" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "admin_id" INTEGER NOT NULL REFERENCES "guruji_profiles"("id"),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "guruji_group_members" (
  "id" SERIAL PRIMARY KEY,
  "group_id" INTEGER NOT NULL REFERENCES "guruji_groups"("id"),
  "guruji_id" INTEGER NOT NULL REFERENCES "guruji_profiles"("id"),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "guruji_id" INTEGER REFERENCES "guruji_profiles"("id"),
  "puja_id" INTEGER REFERENCES "pujas"("id"),
  "date" TIMESTAMP NOT NULL,
  "duration" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" booking_status NOT NULL DEFAULT 'pending',
  "type" puja_type NOT NULL,
  "consultation_type" consultation_type,
  "address" VARCHAR,
  "city" VARCHAR NOT NULL,
  "is_immediate" BOOLEAN DEFAULT FALSE,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "booking_id" INTEGER NOT NULL REFERENCES "bookings"("id"),
  "amount" INTEGER NOT NULL,
  "status" payment_status NOT NULL DEFAULT 'unpaid',
  "transaction_id" VARCHAR,
  "payment_method" VARCHAR,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" SERIAL PRIMARY KEY,
  "booking_id" INTEGER NOT NULL REFERENCES "bookings"("id"),
  "customer_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "guruji_id" INTEGER NOT NULL REFERENCES "guruji_profiles"("id"),
  "rating" INTEGER NOT NULL,
  "review" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "title" VARCHAR NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN DEFAULT FALSE,
  "type" VARCHAR NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "contents" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR NOT NULL UNIQUE,
  "title" VARCHAR NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "promotion_codes" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR NOT NULL UNIQUE,
  "discount_percentage" INTEGER NOT NULL,
  "max_discount" INTEGER,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" SERIAL PRIMARY KEY,
  "sender_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "receiver_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");