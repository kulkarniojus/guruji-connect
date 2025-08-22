import { pool } from './db';

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Run schema migrations
    await migrateSchema();
    
    // Check if the pujas table exists and if it already has data
    const existingPujasResult = await pool.query('SELECT * FROM pujas LIMIT 1');
    
    if (existingPujasResult.rows.length === 0) {
      console.log('Creating default pujas...');
      
      // Insert default pujas using direct SQL queries
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
          type: 'offline',
          items: ['Modak', 'Red flowers', 'Durva grass', 'Red sandal paste'],
          imageUrl: '/images/pujas/ganesh.jpg',
          isPopular: true,
          isActive: true
        }
      ];
      
      for (const puja of defaultPujas) {
        await pool.query(
          `INSERT INTO pujas (
            name, description, "basePrice", type, duration, items, "imageUrl", "isPopular", "isActive", price, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            puja.name,
            puja.description,
            puja.basePrice,
            puja.type,
            puja.duration,
            puja.items,
            puja.imageUrl,
            puja.isPopular,
            puja.isActive,
            puja.basePrice, // Setting price equal to basePrice
            new Date(),
            new Date()
          ]
        );
      }
      
      console.log('Default pujas created');
    } else {
      console.log('Pujas table already has data, skipping initialization');
    }
    
    // Update the price column with values from basePrice if it's null
    await pool.query('UPDATE pujas SET price = "basePrice" WHERE price IS NULL');
    
    // Initialize cities table with default data
    const existingCities = await pool.query('SELECT * FROM cities LIMIT 1').catch(() => ({ rows: [] }));
    
    if (existingCities.rows.length === 0) {
      // Create cities table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          state VARCHAR(255) NOT NULL,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert default cities
      const defaultCities = [
        { name: 'Mumbai', state: 'Maharashtra' },
        { name: 'Delhi', state: 'Delhi' },
        { name: 'Bangalore', state: 'Karnataka' },
        { name: 'Chennai', state: 'Tamil Nadu' },
        { name: 'Kolkata', state: 'West Bengal' },
        { name: 'Hyderabad', state: 'Telangana' },
        { name: 'Pune', state: 'Maharashtra' },
        { name: 'Ahmedabad', state: 'Gujarat' },
        { name: 'Jaipur', state: 'Rajasthan' },
        { name: 'Lucknow', state: 'Uttar Pradesh' },
        { name: 'Nagpur', state: 'Maharashtra' },
        { name: 'Indore', state: 'Madhya Pradesh' },
        { name: 'Bhopal', state: 'Madhya Pradesh' },
        { name: 'Visakhapatnam', state: 'Andhra Pradesh' },
        { name: 'Patna', state: 'Bihar' },
        { name: 'Vadodara', state: 'Gujarat' },
        { name: 'Ghaziabad', state: 'Uttar Pradesh' },
        { name: 'Ludhiana', state: 'Punjab' },
        { name: 'Agra', state: 'Uttar Pradesh' },
        { name: 'Nashik', state: 'Maharashtra' }
      ];

      for (const city of defaultCities) {
        await pool.query(
          `INSERT INTO cities (name, state, "isActive", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5)`,
          [city.name, city.state, true, new Date(), new Date()]
        );
      }
      
      console.log('Default cities created');
    } else {
      console.log('Cities table already has data, skipping initialization');
    }

    console.log('Database initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Apply schema migrations to update database tables with new columns
 */
async function migrateSchema() {
  try {
    console.log('Running schema migrations...');
    
    // Add address columns to users table
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add address columns to users table if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
          ALTER TABLE users ADD COLUMN address TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'city') THEN
          ALTER TABLE users ADD COLUMN city TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'state') THEN
          ALTER TABLE users ADD COLUMN state TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pincode') THEN
          ALTER TABLE users ADD COLUMN pincode TEXT;
        END IF;
      END $$;
    `);
    
    // Add new columns to guruji_profiles table
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add new columns to guruji_profiles table if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'price_per_hour') THEN
          ALTER TABLE guruji_profiles ADD COLUMN price_per_hour INTEGER DEFAULT 500;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'is_available') THEN
          ALTER TABLE guruji_profiles ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'aadhar_verified') THEN
          ALTER TABLE guruji_profiles ADD COLUMN aadhar_verified BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'documents_verified') THEN
          ALTER TABLE guruji_profiles ADD COLUMN documents_verified BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'verification_date') THEN
          ALTER TABLE guruji_profiles ADD COLUMN verification_date TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'languages') THEN
          ALTER TABLE guruji_profiles ADD COLUMN languages TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'certificates') THEN
          ALTER TABLE guruji_profiles ADD COLUMN certificates TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'profile_picture_url') THEN
          ALTER TABLE guruji_profiles ADD COLUMN profile_picture_url TEXT;
        END IF;
        
        -- Update radius default to 20km
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guruji_profiles' AND column_name = 'radius') THEN
          ALTER TABLE guruji_profiles ALTER COLUMN radius SET DEFAULT 20;
        END IF;
      END $$;
    `);
    
    // Check if chatbot tables should be initialized
    await initializeChatbotTables();
    
    console.log('Schema migrations completed successfully');
  } catch (error) {
    console.error('Error during schema migration:', error);
    throw error;
  }
}

/**
 * Initialize chatbot related tables if they don't exist
 */
async function initializeChatbotTables() {
  try {
    // Check if chatbot-related tables have data
    const existingTemplates = await pool.query('SELECT * FROM chatbot_templates LIMIT 1');
    
    if (existingTemplates.rows.length === 0) {
      console.log('Initializing chatbot templates and training data...');
      
      // Insert default chatbot templates
      const defaultTemplates = [
        {
          name: 'Welcome Message',
          description: 'Initial greeting to users',
          content: 'Hello {{name}}! Welcome to GurujiConnect. How can I assist you today? You can ask about pujas, bookings, or finding a guruji.',
          intent: 'greeting',
          variables: ['name'],
          isActive: true
        },
        {
          name: 'Booking Information',
          description: 'Information about booking process',
          content: 'To book a puja, please visit our website or app, select the puja type, city, and preferred date. You can then choose a guruji based on ratings and availability.',
          intent: 'booking_inquiry',
          variables: null,
          isActive: true
        },
        {
          name: 'Puja Information',
          description: 'Information about available pujas',
          content: 'We offer various types of pujas including {{puja_type}}. The price starts from ₹{{price}}. Would you like more details about specific pujas?',
          intent: 'puja_information',
          variables: ['puja_type', 'price'],
          isActive: true
        }
      ];
      
      for (const template of defaultTemplates) {
        await pool.query(
          `INSERT INTO chatbot_templates (
            name, description, content, intent, variables, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            template.name,
            template.description,
            template.content,
            template.intent,
            template.variables,
            template.isActive,
            new Date(),
            new Date()
          ]
        );
      }
      
      // Insert default training data
      const defaultTrainingData = [
        // Greeting intent
        { text: 'Hello', intent: 'greeting' },
        { text: 'Hi there', intent: 'greeting' },
        { text: 'Good morning', intent: 'greeting' },
        { text: 'Hey', intent: 'greeting' },
        { text: 'Greetings', intent: 'greeting' },
        
        // Booking inquiry intent
        { text: 'How can I book a puja?', intent: 'booking_inquiry' },
        { text: 'I want to schedule a puja', intent: 'booking_inquiry' },
        { text: 'What is the booking process?', intent: 'booking_inquiry' },
        { text: 'Can I book a puja for tomorrow?', intent: 'booking_inquiry' },
        { text: 'How to book a guruji?', intent: 'booking_inquiry' },
        
        // Puja information intent
        { text: 'What types of pujas do you offer?', intent: 'puja_information' },
        { text: 'Tell me about Satyanarayan puja', intent: 'puja_information', entities: { pujas: ['Satyanarayan'] } },
        { text: 'How much does Griha Pravesh puja cost?', intent: 'puja_information', entities: { pujas: ['Griha Pravesh'] } },
        { text: 'What is included in Ganapati puja?', intent: 'puja_information', entities: { pujas: ['Ganapati'] } },
        { text: 'I need information about pujas', intent: 'puja_information' }
      ];
      
      for (const data of defaultTrainingData) {
        await pool.query(
          `INSERT INTO chatbot_training_data (
            text, intent, entities, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            data.text,
            data.intent,
            data.entities ? JSON.stringify(data.entities) : null,
            new Date(),
            new Date()
          ]
        );
      }
      
      console.log('Chatbot tables initialized with default data');
    } else {
      console.log('Chatbot tables already have data, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing chatbot tables:', error);
    // Don't throw here, just log the error and continue
  }
}
