import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/notifications',
  cors: true,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  handleConnection(socket: Socket) {
    try {
      const auth = socket.handshake.auth || {};
      let token = auth.token;
      if (!token) throw new UnauthorizedException('Token required');

      if (token.startsWith('Bearer ')) token = token.slice(7);

      const payload: any = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_TOKEN'),
      });

      const userId = payload._id;
      if (!userId) throw new UnauthorizedException('Invalid token');

      const set = this.userSockets.get(userId) || new Set<string>();
      set.add(socket.id);
      this.userSockets.set(userId, set);

      (socket as any).userId = userId;

      console.log(
        `🔔 Notification socket connected: ${socket.id} user:${userId}`,
      );
    } catch (err) {
      console.log('🔴 Notification auth failed:', err.message);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = (socket as any).userId;
    if (!userId) return;

    const set = this.userSockets.get(userId);
    if (!set) return;

    set.delete(socket.id);
    if (set.size === 0) {
      this.userSockets.delete(userId);
    } else {
      this.userSockets.set(userId, set);
    }

    console.log(
      `🔔 Notification socket disconnected: ${socket.id} user:${userId}`,
    );
  }

  sendNotification(userId: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.forEach((sid) => {
      this.server.to(sid).emit('notification', payload);
    });
  }
}
