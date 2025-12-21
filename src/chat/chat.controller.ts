import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Query,
  Param,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SkipCheckPermission, User } from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreatePrivateDto } from './dto/create-private.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { RoomType } from './schemas/room.schema';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms')
  @SkipCheckPermission()
  async getRooms(@User() user: IUser) {
    return this.chatService.getUserRooms(user._id.toString());
  }

  @SkipCheckPermission()
  @Get('pending')
  async getPending(@User() user: IUser) {
    return this.chatService.getPendingRequests(user._id.toString());
  }

  @SkipCheckPermission()
  @Post('pending/:roomId/accept')
  async acceptPending(@User() user: IUser, @Param('roomId') roomId: string) {
    return this.chatService.acceptPendingRequest(roomId, user._id.toString());
  }

  @SkipCheckPermission()
  @Post('pending/:roomId/reject')
  async rejectPending(@User() user: IUser, @Param('roomId') roomId: string) {
    return this.chatService.rejectPendingRequest(roomId, user._id.toString());
  }

  @Post('create-private')
  @SkipCheckPermission()
  async createPrivate(@User() user: IUser, @Body() dto: CreatePrivateDto) {
    const other = dto.otherUserId;
    if (other === user._id.toString()) {
      throw new BadRequestException('Cannot create private chat with yourself');
    }

    const room = await this.chatService.createOrGetPrivateRoom(
      user._id.toString(),
      other,
    );
    return room;
  }

  @Post('create-group')
  @SkipCheckPermission()
  async createGroup(@User() user: IUser, @Body() dto: CreateGroupDto) {
    const memberIds = Array.from(
      new Set([...dto.memberIds, user._id.toString()]),
    );
    return this.chatService.createRoom(memberIds, RoomType.GROUP, dto.name);
  }

  @Post('add-member')
  async addMember(@Body() dto: AddMemberDto) {
    return this.chatService.addMembers(dto.roomId, dto.memberIds);
  }

  @Post('remove-member')
  async removeMember(@Body() dto: { roomId: string; memberId: string }) {
    return this.chatService.removeMember(dto.roomId, dto.memberId);
  }

  @SkipCheckPermission()
  @Get('messages/:roomId')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query() query: GetMessagesDto,
  ) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 30;
    return this.chatService.getMessages(roomId, page, limit);
  }

  @Post('mark-read')
  async markRead(@User() user: IUser, @Body() dto: MarkReadDto) {
    return this.chatService.markRead(dto.roomId, user._id.toString());
  }
}
