import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

export const getRedis = async () => {
  if (client) return client;
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');

  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', () => {
    // 忽略：上层在 publish/subscribe 时会感知失败；开发期不阻塞 API 启动
  });
  await client.connect();
  return client;
};

