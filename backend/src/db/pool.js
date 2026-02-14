import pg from 'pg';

const { Pool } = pg;

let pool = null;
export let useInMemory = true;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  useInMemory = false;
}

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured');
  return pool.query(text, params);
}

export async function getClient() {
  if (!pool) throw new Error('Database not configured');
  return pool.connect();
}

export default pool;
