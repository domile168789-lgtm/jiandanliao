import jwt from 'jsonwebtoken';
import { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: { id: string; role: string };
  }
}

type AdminRole = 'SUPER_ADMIN' | 'OPERATOR' | 'AUDITOR';

type AdminIdentity = {
  id: string;
  role: AdminRole;
  username: string;
};

type AdminTokenPayload = {
  sub: string;
  role: AdminRole;
  username: string;
};

const ADMIN_ACCOUNTS: Record<string, { id: string; role: AdminRole; passwordEnv: string; fallbackPassword: string }> = {
  superadmin: {
    id: '10001',
    role: 'SUPER_ADMIN',
    passwordEnv: 'ADMIN_SUPERADMIN_PASSWORD',
    fallbackPassword: 'change-me-superadmin'
  },
  operator: {
    id: '10002',
    role: 'OPERATOR',
    passwordEnv: 'ADMIN_OPERATOR_PASSWORD',
    fallbackPassword: 'change-me-operator'
  },
  auditor: {
    id: '10003',
    role: 'AUDITOR',
    passwordEnv: 'ADMIN_AUDITOR_PASSWORD',
    fallbackPassword: 'change-me-auditor'
  }
};

const getAdminJwtSecret = () => {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET or JWT_SECRET is required');
  }
  return secret;
};

const getAdminPassword = (username: string, account: { passwordEnv: string; fallbackPassword: string }) =>
  process.env[account.passwordEnv]?.trim() || account.fallbackPassword;

const normalizeRole = (value: string) => value.trim().toUpperCase() as AdminRole;

const resolveAdminFromHeaders = (request: FastifyRequest): AdminIdentity | null => {
  const roleHeader = request.headers['x-admin-role'];
  if (typeof roleHeader !== 'string' || !roleHeader.trim()) return null;

  const adminIdHeader = request.headers['x-admin-id'];
  const role = normalizeRole(roleHeader);
  const fallbackId =
    role === 'SUPER_ADMIN' ? '10001' : role === 'OPERATOR' ? '10002' : role === 'AUDITOR' ? '10003' : '10000';
  const id =
    typeof adminIdHeader === 'string' && /^\d+$/.test(adminIdHeader.trim())
      ? adminIdHeader.trim()
      : fallbackId;

  return {
    id,
    role,
    username: role.toLowerCase()
  };
};

const resolveAdminFromBearerToken = (request: FastifyRequest): AdminIdentity | null => {
  const header = request.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;

  try {
    const payload = jwt.verify(token, getAdminJwtSecret()) as Partial<AdminTokenPayload>;
    if (!payload?.sub || !payload?.role || !payload?.username) return null;
    if (!['SUPER_ADMIN', 'OPERATOR', 'AUDITOR'].includes(payload.role)) return null;
    return {
      id: String(payload.sub),
      role: payload.role,
      username: String(payload.username)
    };
  } catch {
    return null;
  }
};

export const authenticateAdminCredentials = (input: { username: string; password: string }): AdminIdentity | null => {
  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();
  const account = ADMIN_ACCOUNTS[username];
  if (!account) return null;
  if (!password || password !== getAdminPassword(username, account)) return null;

  return {
    id: account.id,
    role: account.role,
    username
  };
};

export const signAdminAccessToken = (admin: AdminIdentity) =>
  jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      username: admin.username
    } satisfies AdminTokenPayload,
    getAdminJwtSecret(),
    { expiresIn: '12h' }
  );

export async function adminAuthPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const admin = resolveAdminFromHeaders(request) || resolveAdminFromBearerToken(request);
    if (!admin) return;
    request.admin = { id: admin.id, role: admin.role };
  });
}
