export const WsEvents = {
  AUTHENTICATE: 'auth:authenticate',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  USER_ONLINE: 'presence:online'
} as const;

