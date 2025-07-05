
import { pool } from './server/db';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query execution successful!');
    console.log('Current database time:', result.rows[0].current_time);
    
    // Test tables existence
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('✅ Available tables:', tablesResult.rows.map(row => row.table_name));
    
    // Test users table specifically
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('✅ Users table accessible, count:', usersCount.rows[0].count);
    
    client.release();
    console.log('✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
