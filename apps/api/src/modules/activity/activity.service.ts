import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { getRedis } from '../../redis.js';

export type ActivityType = 'DISCOUNT' | 'CHECKIN' | 'LUCKY_DRAW' | 'INVITE' | 'BANNER' | 'RED_PACKET';
export type ActivityStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED';

type ActivityConfig = Record<string, any>;

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

export class ActivityService {
  private ensureDb() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    return getDb();
  }

  async list(limit = 100) {
    const db = this.ensureDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              activity_type AS activityType,
              title,
              content,
              cover_url AS coverUrl,
              status,
              start_at AS startAt,
              end_at AS endAt,
              JSON_EXTRACT(config_json, '$') AS config,
              created_by AS createdBy,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM activity_campaigns
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows.map((row) => ({
      ...row,
      config: parseJsonValue<ActivityConfig>(row.config, {})
    }));
  }

  async create(
    input: {
      activityType: ActivityType;
      title: string;
      content: string;
      coverUrl?: string | null;
      status?: ActivityStatus;
      startAt?: string | null;
      endAt?: string | null;
      config?: ActivityConfig;
    },
    adminId: string
  ) {
    const db = this.ensureDb();
    const id = randomUUID();
    const now = new Date();
    const row = {
      id,
      activityType: input.activityType,
      title: input.title,
      content: input.content,
      coverUrl: input.coverUrl ?? null,
      status: input.status ?? 'DRAFT',
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      config: input.config ?? {},
      createdBy: adminId,
      createdAt: now,
      updatedAt: now
    };

    await db.execute(
      `INSERT INTO activity_campaigns (
         id,
         activity_type,
         title,
         content,
         cover_url,
         status,
         start_at,
         end_at,
         config_json,
         created_by,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.activityType,
        row.title,
        row.content,
        row.coverUrl,
        row.status,
        row.startAt,
        row.endAt,
        JSON.stringify(row.config),
        row.createdBy,
        row.createdAt,
        row.updatedAt
      ]
    );

    if (row.status === 'PUBLISHED' && process.env.REDIS_URL) {
      try {
        const redis = await getRedis();
        await redis.publish(
          'jianliao:server:event',
          JSON.stringify({
            type: 'activity_published',
            activityId: row.id,
            title: row.title,
            status: 'PUBLISHED'
          })
        );
      } catch {
        // ignore
      }
    }

    return row;
  }
}
