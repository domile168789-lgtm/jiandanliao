import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { markOnline } from './presence.js';
import {
  LEGACY_MESSAGE_CHANNEL,
  LEGACY_RECEIPT_CHANNEL,
  SERVER_EVENT_CHANNEL,
  ServerEvent
} from './events.js';

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

httpServer.on('request', (req, res) => {
  if (req.url !== '/health') return;

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      ok: true,
      service: 'ws'
    })
  );
});

io.on('connection', (socket) => {
  socket.on('auth:authenticate', ({ userId }) => {
    markOnline(userId, socket.id);
    socket.join(`user:${userId}`);
  });

  socket.on('conversation:join', ({ conversationId }) => {
    if (conversationId) socket.join(`conversation:${conversationId}`);
  });
});

const port = Number(process.env.WS_PORT || 3002);

const emitServerEvent = (event: ServerEvent) => {
  if (event.type === 'message_created') {
    io.to(`conversation:${event.conversationId}`).emit('message_created', event);
    io.to(`conversation:${event.conversationId}`).emit('message:new', event.message);
    return;
  }

  if (event.type === 'message_read') {
    io.to(`conversation:${event.conversationId}`).emit('message_read', event);
    io.to(`conversation:${event.conversationId}`).emit('receipt:new', event.receipt);
    return;
  }

  if (event.type === 'message_delivered') {
    io.to(`conversation:${event.conversationId}`).emit('message_delivered', event);
    io.to(`conversation:${event.conversationId}`).emit('receipt:new', event.receipt);
    return;
  }

  if (event.type === 'unread_updated') {
    io.to(`user:${event.userId}`).emit('unread.updated', event);
    return;
  }

  if (event.type === 'system_notice') {
    io.to(`conversation:${event.conversationId}`).emit('system_notice', event);
    return;
  }

  if (event.type === 'moderation_result') {
    io.to(`user:${event.targetUserId}`).emit('moderation_result', event);
    io.to(`conversation:${event.conversationId}`).emit('moderation_result', event);
    return;
  }

  io.emit('activity_published', event);
};

// Redis PubSub → WS 广播
if (process.env.REDIS_URL) {
  const sub = createClient({ url: process.env.REDIS_URL });
  sub.connect().then(async () => {
    await sub.subscribe(SERVER_EVENT_CHANNEL, (message) => {
      try {
        emitServerEvent(JSON.parse(message) as ServerEvent);
      } catch {
        // ignore
      }
    });
    await sub.subscribe(LEGACY_MESSAGE_CHANNEL, (message) => {
      try {
        const evt = JSON.parse(message);
        io.to(`conversation:${evt.conversationId}`).emit('message:new', evt.message);
      } catch {
        // ignore
      }
    });
    await sub.subscribe(LEGACY_RECEIPT_CHANNEL, (message) => {
      try {
        const evt = JSON.parse(message);
        io.to(`conversation:${evt.conversationId}`).emit('receipt:new', evt.receipt);
      } catch {
        // ignore
      }
    });
  });
}

httpServer.listen(port);
