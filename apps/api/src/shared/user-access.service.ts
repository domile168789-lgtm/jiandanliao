import { getDb } from '../db.js';

export class UserAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccessError';
  }
}

export async function resolveUserAccessByPhone(phone: string) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const db = getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT id, status
     FROM users
     WHERE phone = ?
     LIMIT 1`,
    [phone]
  );

  const row = rows?.[0] as { id?: string; status?: string } | undefined;
  if (!row?.id) {
    throw new UserAccessError('user not found');
  }
  if (row.status === 'BANNED') {
    throw new UserAccessError('user banned');
  }

  return {
    userId: row.id,
    status: row.status || 'ACTIVE'
  };
}

