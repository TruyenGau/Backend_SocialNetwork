import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomType } from './schemas/room.schema';
import { Message } from './schemas/message.schema';
import { MessageType } from './schemas/message.schema';
import { Follow } from 'src/follows/schemas/follow.schemas';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Follow.name) private followModel: Model<Follow>,
  ) {}

  async findPrivateRoom(userA: string, userB: string) {
    return this.roomModel.findOne({
      type: RoomType.PRIVATE,
      members: { $all: [new Types.ObjectId(userA), new Types.ObjectId(userB)] },
    });
  }

  async findRoomById(roomId: string): Promise<Room | null> {
    return this.roomModel
      .findById(roomId)
      .populate('members', 'name email')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name email' },
      })
      .exec();
  }

  async createRoom(memberIds: string[], type: RoomType, name?: string) {
    if (!memberIds || memberIds.length === 0)
      throw new BadRequestException('Phải có ít nhất 1 member');

    const members = memberIds.map((id) => new Types.ObjectId(id));
    const room = new this.roomModel({ members, type, name });
    return room.save();
  }

  async createOrGetPrivateRoom(userA: string, userB: string) {
    // userA = người gửi, userB = người nhận
    let room = await this.findPrivateRoom(userA, userB);
    if (!room) {
      const senderId = new Types.ObjectId(userA);
      const receiverId = new Types.ObjectId(userB);

      // 👇 kiểm tra: người nhận có follow người gửi không?
      const isFollowing = await this.followModel.exists({
        follower: receiverId, // B
        following: senderId, // A
      });

      const members = [senderId, receiverId];

      room = await this.roomModel.create({
        type: RoomType.PRIVATE,
        members,
        isPending: !isFollowing, // nếu chưa follow → tin nhắn chờ
        pendingFor: !isFollowing ? receiverId : null,
      });
    }

    return room;
  }

  async saveMessage(
    senderId: string,
    roomId: string,
    payload: {
      type: MessageType | 'text' | 'image' | 'video';
      content: string;
    },
  ) {
    const type: MessageType = (payload.type as MessageType) ?? MessageType.TEXT;

    const msg = await this.messageModel.create({
      sender: new Types.ObjectId(senderId), // 👈 lưu đúng kiểu ObjectId
      room: new Types.ObjectId(roomId),
      type,
      content: payload.content,
    });

    return msg.populate('sender', '_id name avatar');
  }

  async getMessages(roomId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const roomObjectId = new Types.ObjectId(roomId);

    const docs = await this.messageModel
      .find({ room: roomObjectId }) // 👈 QUAN TRỌNG
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', '_id name avatar')
      .lean()
      .exec();

    return docs.reverse();
  }

  async getUserRooms(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    return this.roomModel
      .find({
        members: userObjectId,
        // nếu là tin nhắn chờ cho chính user này thì KHÔNG đưa vào list thường
        $or: [
          { type: RoomType.GROUP }, // nhóm luôn cho phép
          { isPending: { $ne: true } },
          { pendingFor: { $ne: userObjectId } },
        ],
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name email' },
      })
      .populate('members', 'name email avatar online')
      .sort({ updatedAt: -1 });
  }

  async addMembers(roomId: string, memberIds: string[]) {
    const room = await this.roomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const newMembers = memberIds.map((id) => new Types.ObjectId(id));
    room.members = Array.from(
      new Set([...room.members.map((m) => m.toString()), ...memberIds]),
    ).map((id) => new Types.ObjectId(id));

    return room.save();
  }

  async removeMember(roomId: string, memberId: string) {
    const room = await this.roomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    room.members = room.members.filter((m) => m.toString() !== memberId);
    return room.save();
  }

  async markRead(roomId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        room: new Types.ObjectId(roomId),
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      { $push: { readBy: new Types.ObjectId(userId) } },
    );
    return { ok: true };
  }

  async getUnreadCount(roomId: string, userId: string) {
    return this.messageModel.countDocuments({
      room: new Types.ObjectId(roomId),
      readBy: { $ne: new Types.ObjectId(userId) },
    });
  }

  async getPendingRequests(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // các room private đang chờ user này duyệt
    const rooms = await this.roomModel
      .find({
        type: RoomType.PRIVATE,
        isPending: true,
        pendingFor: userObjectId,
      })
      .populate('members', 'name avatar online')
      .exec();

    const result = await Promise.all(
      rooms.map(async (room) => {
        const members: any[] = room.members as any[];
        // người gửi là member còn lại
        const sender = members.find((m) => m._id.toString() !== userId);

        const lastMessage = await this.messageModel
          .findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name')
          .exec();

        return {
          roomId: room._id.toString(),
          sender,
          lastMessage: lastMessage?.content || '',
          lastMessageAt: lastMessage
            ? (lastMessage as any).createdAt
            : undefined,
        };
      }),
    );

    // Bạn có interceptor bọc dạng IBackendRes, nên chỉ cần return result là được
    return result;
  }

  // chấp nhận tin nhắn chờ
  async acceptPendingRequest(roomId: string, userId: string) {
    const room = await this.roomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const pending = (room as any).pending || {};
    delete pending[userId];
    (room as any).pending = pending;

    await room.save();
    return { ok: true };
  }

  // từ chối tin nhắn chờ
  async rejectPendingRequest(roomId: string, userId: string) {
    const room = await this.roomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const pending = (room as any).pending || {};
    delete pending[userId];
    (room as any).pending = pending;

    await room.save();
    return { ok: true };
  }
}
