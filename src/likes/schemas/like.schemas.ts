// src/posts/schemas/like.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Post } from 'src/posts/schemas/post.schemas';
import { User } from 'src/users/schemas/user.schema';

export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: true })
export class Like {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Post.name,
    required: true,
    index: true,
  })
  postId: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

  // soft delete (tự quản lý trong Like)
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop()
  deletedAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Mỗi user chỉ like 1 lần/post khi like còn hiệu lực
LikeSchema.index(
  { postId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } },
);

// Index phổ biến
LikeSchema.index({ userId: 1, isDeleted: 1 });
LikeSchema.index({ postId: 1, isDeleted: 1 });
