export const WsEvents = {
  AUTHENTICATE: 'auth:authenticate',
  MESSAGE_CREATED: 'message_created',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  UNREAD_UPDATED: 'unread.updated',
  USER_ONLINE: 'presence:online'
} as const;
