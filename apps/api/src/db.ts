import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const getDb = () => {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  // 兼容 mysql://user:pass@host:port/db
  pool = mysql.createPool(process.env.DATABASE_URL);
  return pool;
};
