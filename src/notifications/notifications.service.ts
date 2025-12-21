import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schemas';
import { NotificationGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private gateway: NotificationGateway,
  ) {}

  // Tạo thông báo
  async createNotification(params: {
    userId: Types.ObjectId;
    fromUserId: Types.ObjectId;
    type: 'LIKE' | 'COMMENT' | 'GROUP_INVITE';
    postId?: Types.ObjectId; // ✅ optional
    groupId?: Types.ObjectId; // ✅ thêm
  }) {
    // 1️⃣ Lưu DB
    const noti = await this.notificationModel.create({
      userId: params.userId,
      fromUserId: params.fromUserId,
      type: params.type,
      postId: params.postId,
      groupId: params.groupId,
      isRead: false,
    });

    // 2️⃣ Lấy user gửi thông báo
    const fromUser = await this.notificationModel.db
      .collection('users')
      .findOne(
        { _id: params.fromUserId },
        { projection: { name: 1, avatar: 1 } },
      );

    // 3️⃣ Gửi realtime
    this.gateway.sendNotification(params.userId.toString(), {
      _id: noti._id,
      type: noti.type,
      postId: noti.postId,
      groupId: noti.groupId, // ✅ QUAN TRỌNG
      createdAt: noti.createdAt,
      isRead: false,
      fromUserId: {
        _id: fromUser?._id,
        name: fromUser?.name,
        avatar: fromUser?.avatar,
      },
    });

    return noti;
  }

  // Lấy danh sách thông báo
  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'name avatar')
      .lean();
    // return 'abc';
  }

  // Đánh dấu đã đọc
  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(id, { isRead: true });
  }
}
