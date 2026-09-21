import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class SocketServer {
  private static io: SocketIOServer | null = null;

  public static initialize(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin: any, callback: any) => {
          callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        // Allow unauthenticated connection or proceed as guest
        return next();
      }

      try {
        const payload = verifyAccessToken(String(token));
        (socket as any).user = payload;
        next();
      } catch (err) {
        logger.warn('Socket authentication token invalid');
        next();
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
      logger.info(`Socket connected: ${socket.id} (User: ${user?.email || 'Anonymous'})`);

      // Join organization room
      socket.on('join:org', (orgId: string) => {
        if (orgId) {
          socket.join(`org:${orgId}`);
          logger.info(`Socket ${socket.id} joined room: org:${orgId}`);
        }
      });

      // Join specific conversation room
      socket.on('join:conversation', (conversationId: string) => {
        if (conversationId) {
          socket.join(`conv:${conversationId}`);
        }
      });

      socket.on('leave:conversation', (conversationId: string) => {
        if (conversationId) {
          socket.leave(`conv:${conversationId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    logger.info('🔌 Socket.IO Server initialized.');
  }

  public static emitToOrg(orgId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`org:${orgId}`).emit(event, data);
    }
  }

  public static emitToConversation(conversationId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`conv:${conversationId}`).emit(event, data);
    }
  }

  public static emitGlobal(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}
