import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RoomType {
  PRIVATE = 'private',
  GROUP = 'group',
}

@Schema({ timestamps: true })
export class Room extends Document {
  @Prop({ type: String, enum: RoomType, required: true })
  type: RoomType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  members: Types.ObjectId[];

  @Prop({ type: String })
  name?: string;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isPending: boolean; // room này là tin nhắn chờ?

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  pendingFor?: Types.ObjectId | null; // đang chờ user nào duyệt
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// index for quick lookup of private rooms
RoomSchema.index({ type: 1, members: 1 });
