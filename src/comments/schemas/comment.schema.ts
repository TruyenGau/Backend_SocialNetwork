// src/posts/schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Post } from 'src/posts/schemas/post.schemas';
import { User } from 'src/users/schemas/user.schema';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
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

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  })
  parentId: mongoose.Schema.Types.ObjectId | null;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 0 })
  likesCount: number;

  // đếm số trả lời trực tiếp (chỉ 1 cấp con)
  @Prop({ default: 0 })
  repliesCount: number;

  @Prop({ type: Object })
  createdBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop({ type: Object })
  updatedBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop({ type: Object })
  deletedBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;
  createdAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Index tổng hợp hay dùng
// CommentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });
// CommentSchema.index({ userId: 1, createdAt: -1 });
