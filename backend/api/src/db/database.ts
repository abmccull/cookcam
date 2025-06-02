// Database utility for CookCam API
import { Pool, PoolClient, QueryResult } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Supabase client (existing)
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// PostgreSQL Pool for direct database access (needed for USDA service)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper function to execute queries with proper error handling
export async function executeQuery(text: string, params: unknown[] = []): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    logger.error('Database query error', { query: text.substring(0, 100), error });
    throw error;
  } finally {
    client.release();
  }
}

// Helper function for transactions
export async function executeTransaction(operations: ((client: PoolClient) => Promise<unknown>)[]): Promise<unknown[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const operation of operations) {
      const result = await operation(client);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database transaction error', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool; 