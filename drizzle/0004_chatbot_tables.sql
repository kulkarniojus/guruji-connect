-- Create chatbot_intent enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "chatbot_intent" AS ENUM ('greeting', 'booking_inquiry', 'puja_information', 'guruji_availability', 'payment_issue', 'cancel_booking', 'reschedule_booking', 'general_inquiry', 'technical_support', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create whatsapp_users table
CREATE TABLE IF NOT EXISTS "whatsapp_users" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id"),
  "whatsapp_number" TEXT NOT NULL UNIQUE,
  "is_verified" BOOLEAN DEFAULT FALSE,
  "is_opted_in" BOOLEAN DEFAULT TRUE,
  "last_interaction_at" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create whatsapp_conversations table
CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
  "id" SERIAL PRIMARY KEY,
  "whatsapp_user_id" INTEGER NOT NULL REFERENCES "whatsapp_users"("id"),
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_message_at" TIMESTAMP DEFAULT NOW(),
  "context_data" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" SERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "whatsapp_conversations"("id"),
  "direction" TEXT NOT NULL,
  "message_content" TEXT NOT NULL,
  "media_url" TEXT,
  "is_delivered" BOOLEAN DEFAULT FALSE,
  "is_read" BOOLEAN DEFAULT FALSE,
  "message_id" TEXT,
  "intent" "chatbot_intent",
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create chatbot_templates table
CREATE TABLE IF NOT EXISTS "chatbot_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "intent" "chatbot_intent" NOT NULL,
  "variables" TEXT[],
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create chatbot_training_data table
CREATE TABLE IF NOT EXISTS "chatbot_training_data" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "intent" "chatbot_intent" NOT NULL,
  "entities" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_whatsapp_users_number" ON "whatsapp_users"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_conversations_user" ON "whatsapp_conversations"("whatsapp_user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_conversation" ON "whatsapp_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_chatbot_templates_intent" ON "chatbot_templates"("intent");
CREATE INDEX IF NOT EXISTS "idx_chatbot_training_data_intent" ON "chatbot_training_data"("intent");