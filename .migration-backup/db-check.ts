import { pool } from './server/db';

async function checkDatabaseTables() {
  try {
    console.log('Checking database tables...');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Available tables:', tablesResult.rows.map(row => row.table_name));
    
    // Close the connection
    await pool.end();
    
    console.log('Database check completed');
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabaseTables();