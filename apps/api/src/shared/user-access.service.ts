import { getDb } from '../db.js';
import { previewStore } from '../modules/im-preview/preview-store.js';

export class UserAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccessError';
  }
}

export async function resolveUserAccessByPhone(phone: string) {
  if (!process.env.DATABASE_URL) {
    try {
      return previewStore.resolveUserAccess(phone);
    } catch (error) {
      if (error instanceof Error && error.message === 'user not found') {
        throw new UserAccessError('user not found');
      }
      if (error instanceof Error && error.message === 'user banned') {
        throw new UserAccessError('user banned');
      }
      throw error;
    }
  }
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
