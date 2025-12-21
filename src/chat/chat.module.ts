import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Room, RoomSchema } from './schemas/room.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { Follow, FollowSchema } from 'src/follows/schemas/follow.schemas';
import { NotificationGateway } from 'src/notifications/notifications.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Follow.name, schema: FollowSchema },
    ]),
    UsersModule,
  ],
  providers: [ChatGateway, ChatService, NotificationGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
