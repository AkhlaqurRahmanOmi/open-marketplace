import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { NotificationChannel } from '../enums';

interface NotificationPayload {
  id: number;
  userId: number;
  event: string;
  channel: NotificationChannel;
  title?: string;
  message: string;
  data?: any;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSocketMap = new Map<number, Set<string>>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract userId from query params or auth token
    const userId = this.extractUserId(client);

    if (userId) {
      // Join user-specific room
      client.join(`user-${userId}`);

      // Track socket for this user
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)?.add(client.id);

      this.logger.log(`User ${userId} joined room user-${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = this.extractUserId(client);

    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
    }
  }

  private extractUserId(client: Socket): number | null {
    try {
      // Option 1: From query params
      const userIdFromQuery = client.handshake.query.userId as string;
      if (userIdFromQuery) {
        return parseInt(userIdFromQuery, 10);
      }

      // Option 2: From auth token (implement JWT validation here if needed)
      // const token = client.handshake.auth.token;
      // const decoded = verifyJWT(token);
      // return decoded.userId;

      return null;
    } catch (error) {
      this.logger.error('Failed to extract userId:', error);
      return null;
    }
  }

  // Send notification to a specific user
  sendToUser(userId: number, notification: NotificationPayload) {
    const room = `user-${userId}`;
    this.server.to(room).emit('notification', notification);
    this.logger.debug(`Sent notification to user ${userId}`);
  }

  // Send notification to multiple users
  sendToUsers(userIds: number[], notification: NotificationPayload) {
    userIds.forEach((userId) => {
      this.sendToUser(userId, notification);
    });
  }

  // Broadcast to all connected clients
  broadcast(notification: NotificationPayload) {
    this.server.emit('notification', notification);
    this.logger.debug('Broadcast notification to all users');
  }

  // Send notification to admin room
  sendToAdmins(notification: NotificationPayload) {
    this.server.to('admin').emit('notification', notification);
    this.logger.debug('Sent notification to admins');
  }

  // Check if user is online
  isUserOnline(userId: number): boolean {
    return this.userSocketMap.has(userId);
  }

  // Get count of connected clients for a user
  getUserConnectionCount(userId: number): number {
    return this.userSocketMap.get(userId)?.size || 0;
  }

  // Subscribe to join admin room (requires admin guard in production)
  @SubscribeMessage('joinAdmin')
  handleJoinAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin');
    this.logger.log(`Client ${client.id} joined admin room`);
    return { success: true };
  }

  // Handle mark as read event
  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @MessageBody() data: { notificationIds: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.extractUserId(client);
    this.logger.debug(`User ${userId} marked notifications as read:`, data.notificationIds);
    return { success: true };
  }

  // Ping/Pong for connection health check
  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { timestamp: new Date() } };
  }
}
