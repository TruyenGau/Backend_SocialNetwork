import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { NotificationGateway } from 'src/notifications/notifications.gateway';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId -> set socketIds (đa tab)
  private userSockets = new Map<string, Set<string>>();

  // userId -> roomId đang active
  private activeRooms = new Map<string, string | null>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private notificationGateway: NotificationGateway,
  ) {}

  // ================= CONNECT =================
  async handleConnection(socket: Socket) {
    try {
      let token = socket.handshake.auth?.token;
      if (!token) throw new UnauthorizedException();

      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const payload: any = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_TOKEN'),
      });

      const userId = payload?._id;
      if (!userId) throw new UnauthorizedException();

      // lưu socket
      const set = this.userSockets.get(userId) ?? new Set<string>();
      set.add(socket.id);
      this.userSockets.set(userId, set);

      (socket as any).userId = userId;

      await this.usersService.setOnline(userId, true);

      console.log(`💬 Chat connected ${socket.id} user:${userId}`);
    } catch (err) {
      socket.disconnect(true);
    }
  }

  // ================= DISCONNECT =================
  async handleDisconnect(socket: Socket) {
    const userId = (socket as any).userId;
    if (!userId) return;

    const set = this.userSockets.get(userId);
    if (!set) return;

    set.delete(socket.id);

    if (set.size === 0) {
      this.userSockets.delete(userId);
      this.activeRooms.delete(userId);
      await this.usersService.setOnline(userId, false);
    }

    console.log(`💬 Chat disconnected ${socket.id} user:${userId}`);
  }

  // ================= JOIN PRIVATE ROOM =================
  @SubscribeMessage('join_private')
  async joinPrivate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = (socket as any).userId;
    if (!userId || !body?.roomId) return;

    await socket.join(body.roomId);

    this.activeRooms.set(userId, body.roomId);

    console.log(`👥 User ${userId} joined private room ${body.roomId}`);
  }

  // ================= LEAVE ROOM =================
  @SubscribeMessage('leave_room')
  leaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { roomId?: string },
  ) {
    const userId = (socket as any).userId;
    if (!userId) return;

    if (body?.roomId) {
      socket.leave(body.roomId);
    }

    this.activeRooms.set(userId, null);

    console.log(`🚪 User ${userId} left room ${body?.roomId}`);
  }

  // ================= PRIVATE MESSAGE =================
  @SubscribeMessage('send_message')
  async sendPrivateMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: {
      receiverId: string;
      content: string;
      type?: 'text' | 'image' | 'video';
    },
  ) {
    const senderId = (socket as any).userId;
    if (!senderId || !body.receiverId || !body.content) return;

    const room = await this.chatService.createOrGetPrivateRoom(
      senderId,
      body.receiverId,
    );

    const roomId = room._id.toString();

    const savedMessage = await this.chatService.saveMessage(senderId, roomId, {
      type: body.type ?? 'text',
      content: body.content,
    });

    // 🔴 realtime
    this.server.to(roomId).emit('receive_message', savedMessage);

    // 🔔 notification (CHỈ khi receiver KHÔNG ở room)
    const receiverActiveRoom = this.activeRooms.get(body.receiverId);

    if (receiverActiveRoom !== roomId) {
      this.notificationGateway.sendNotification(body.receiverId, {
        type: 'CHAT_PRIVATE',
        roomId,
        senderId,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
      });
    }
  }

  // ================= JOIN GROUP =================
  @SubscribeMessage('join_group')
  async joinGroup(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = (socket as any).userId;
    if (!userId || !body.roomId) return;

    const room = await this.chatService.findRoomById(body.roomId);
    if (!room) return;

    if (!room.members.some((m) => m._id.toString() === userId)) return;

    await socket.join(body.roomId);

    this.activeRooms.set(userId, body.roomId);

    console.log(`👥 User ${userId} joined group ${body.roomId}`);
  }

  // ================= GROUP MESSAGE =================
  @SubscribeMessage('send_group_message')
  async sendGroupMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: {
      roomId: string;
      content: string;
      type?: 'text' | 'image' | 'video';
    },
  ) {
    const senderId = (socket as any).userId;
    if (!senderId || !body.roomId || !body.content) return;

    const room = await this.chatService.findRoomById(body.roomId);
    if (!room) return;

    const savedMessage = await this.chatService.saveMessage(
      senderId,
      body.roomId,
      {
        type: body.type ?? 'text',
        content: body.content,
      },
    );

    // 🔴 realtime
    this.server.to(body.roomId).emit('receive_group_message', savedMessage);

    // 🔔 notification
    room.members.forEach((m) => {
      const memberId = m._id.toString();
      if (memberId === senderId) return;

      const activeRoom = this.activeRooms.get(memberId);
      if (activeRoom === body.roomId) return;

      this.notificationGateway.sendNotification(memberId, {
        type: 'CHAT_GROUP',
        roomId: body.roomId,
        senderId,
        content: body.content,
        createdAt: savedMessage.createdAt,
      });
    });
  }
}
