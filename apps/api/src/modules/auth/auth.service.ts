import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { signAccessToken, signRefreshToken } from './token.js';
import { hashPassword, verifyPassword } from './password.js';
import { previewStore } from '../im-preview/preview-store.js';

type RegisterInput = { phone: string; password: string; deviceId: string; platform?: string; nickname?: string };
type LoginSmsInput = { phone: string; code: string; deviceId: string; platform?: string };
type LoginPasswordInput = { phone: string; password: string; deviceId: string; platform?: string };
type RefreshInput = { phone: string; refreshToken: string; deviceId: string };

export class AuthService {
  async register(input: RegisterInput) {
    if (!process.env.DATABASE_URL) {
      const result = previewStore.register(input);
      return {
        accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
        refreshToken: result.refreshToken
      };
    }
    const db = getDb();
    const now = new Date();

    const userId = randomUUID();
    const nickname = input.nickname || `用户${input.phone.slice(-4)}`;
    const passwordHash = hashPassword(input.password);
    const platform = input.platform || 'unknown';

    await db.execute(
      `INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
      [userId, input.phone, nickname, now, now]
    );
    await db.execute(`INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)`, [userId, passwordHash]);

    const refreshToken = signRefreshToken({ sub: input.phone, deviceId: input.deviceId });
    await db.execute(
      `INSERT INTO user_devices (id, user_id, platform, device_id, refresh_token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), platform = VALUES(platform), updated_at = VALUES(updated_at)`,
      [randomUUID(), userId, platform, input.deviceId, refreshToken, now]
    );

    return {
      accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
      refreshToken
    };
  }

  async loginWithSms(input: LoginSmsInput) {
    // 按当前产品策略：暂时关闭短信登录（避免固定验证码被误用到线上）
    throw new Error('sms login disabled');

    // 开发期兼容无数据库：先跑通端到端流程
    if (!process.env.DATABASE_URL) {
      return {
        accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
        refreshToken: signRefreshToken({ sub: input.phone, deviceId: input.deviceId })
      };
    }

    const db = getDb();
    const now = new Date();
    const platform = input.platform || 'unknown';

    // upsert user by phone
    const [rows] = await db.execute<any[]>(
      `SELECT id, phone FROM users WHERE phone = ? LIMIT 1`,
      [input.phone]
    );

    let userId = rows?.[0]?.id as string | undefined;
    if (!userId) {
      const newUserId = randomUUID();
      await db.execute(
        `INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
        [newUserId, input.phone, `用户${input.phone.slice(-4)}`, now, now]
      );
      await db.execute(`INSERT INTO user_credentials (user_id, password_hash) VALUES (?, NULL)`, [newUserId]);
      userId = newUserId;
    }

    if (!userId) {
      throw new Error('failed to resolve user');
    }

    const ensuredUserId = userId!;
    const refreshToken = signRefreshToken({ sub: input.phone, deviceId: input.deviceId });
    const userDeviceValues: [string, string, string, string, string, Date] = [
      randomUUID(),
      ensuredUserId,
      platform,
      input.deviceId,
      refreshToken,
      now
    ];

    await db.execute(
      `INSERT INTO user_devices (id, user_id, platform, device_id, refresh_token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), platform = VALUES(platform), updated_at = VALUES(updated_at)`,
      userDeviceValues
    );

    return {
      accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
      refreshToken
    };
  }

  async loginWithPassword(input: LoginPasswordInput) {
    if (!process.env.DATABASE_URL) {
      const result = previewStore.login(input);
      return {
        accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
        refreshToken: result.refreshToken
      };
    }
    const db = getDb();
    const now = new Date();
    const platform = input.platform || 'unknown';

    const [rows] = await db.execute<any[]>(
      `SELECT u.id AS userId, u.status AS status, c.password_hash AS passwordHash
       FROM users u
       LEFT JOIN user_credentials c ON c.user_id = u.id
       WHERE u.phone = ?
       LIMIT 1`,
      [input.phone]
    );
    const row = rows?.[0];
    if (!row?.passwordHash) throw new Error('no password set');
    if (row.status === 'BANNED') throw new Error('user banned');
    if (!verifyPassword(input.password, row.passwordHash)) throw new Error('invalid password');

    const refreshToken = signRefreshToken({ sub: input.phone, deviceId: input.deviceId });
    await db.execute(
      `INSERT INTO user_devices (id, user_id, platform, device_id, refresh_token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), platform = VALUES(platform), updated_at = VALUES(updated_at)`,
      [randomUUID(), row.userId, platform, input.deviceId, refreshToken, now]
    );

    return {
      accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
      refreshToken
    };
  }

  async refreshToken(input: RefreshInput) {
    if (!process.env.DATABASE_URL) {
      const result = previewStore.refresh(input);
      return {
        accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
        refreshToken: result.refreshToken
      };
    }
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT d.refresh_token AS refreshToken
       FROM users u
       JOIN user_devices d ON d.user_id = u.id
       WHERE u.phone = ? AND d.device_id = ?
       LIMIT 1`,
      [input.phone, input.deviceId]
    );
    const stored = rows?.[0]?.refreshToken as string | undefined;
    if (!stored || stored !== input.refreshToken) throw new Error('invalid refresh token');

    const newRefreshToken = signRefreshToken({ sub: input.phone, deviceId: input.deviceId });
    await db.execute(
      `UPDATE user_devices d
       JOIN users u ON u.id = d.user_id
       SET d.refresh_token = ?, d.updated_at = ?
       WHERE u.phone = ? AND d.device_id = ?`,
      [newRefreshToken, new Date(), input.phone, input.deviceId]
    );

    return {
      accessToken: signAccessToken({ sub: input.phone, deviceId: input.deviceId }),
      refreshToken: newRefreshToken
    };
  }
}
