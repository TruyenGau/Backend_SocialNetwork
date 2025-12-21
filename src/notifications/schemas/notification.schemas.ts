import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId; // chủ post – người nhận thông báo

  @Prop({ type: Types.ObjectId, required: true })
  fromUserId: Types.ObjectId; // người gây ra hành động

  @Prop({ required: true })
  type: 'LIKE' | 'COMMENT' | 'GROUP_INVITE';

  @Prop({ type: Types.ObjectId })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  postId: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
