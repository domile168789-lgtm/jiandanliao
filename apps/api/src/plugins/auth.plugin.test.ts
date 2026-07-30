import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { authPlugin } from './auth.plugin.js';

describe('authPlugin runtime wiring', () => {
  it('attaches request.user when mounted directly on the app context', async () => {
    process.env.JWT_SECRET = 'probe-secret';

    const app = Fastify();
    await authPlugin(app);

    app.get('/probe', async request => ({
      user: request.user ?? null
    }));

    const token = jwt.sign({ sub: '85510000001', deviceId: 'probe-1' }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });

    const res = await app.inject({
      method: 'GET',
      url: '/probe',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      user: {
        phone: '85510000001',
        deviceId: 'probe-1'
      }
    });

    await app.close();
  });
});
