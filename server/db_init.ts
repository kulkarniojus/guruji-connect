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
    
    console.log('Schema migrations completed successfully');
  } catch (error) {
    console.error('Error during schema migration:', error);
    throw error;
  }
}
