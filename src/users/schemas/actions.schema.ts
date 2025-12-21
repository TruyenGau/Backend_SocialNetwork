import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Post } from 'src/posts/schemas/post.schemas';

export type ActionDocument = HydratedDocument<Action>;

export enum ActionType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
}

@Schema({ timestamps: true })
export class Action {
  // Người thực hiện hành động
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  actorId: mongoose.Schema.Types.ObjectId;

  // Người bị tác động (user được follow / chủ post)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  targetId: mongoose.Schema.Types.ObjectId;

  // Loại hành động
  @Prop({
    type: String,
    enum: Object.values(ActionType),
    required: true,
    index: true,
  })
  actionType: ActionType;

  // Optional – phục vụ phân tích sâu
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Post.name,
    default: null,
  })
  postId?: mongoose.Schema.Types.ObjectId;

  // Soft delete (unfollow / unlike)
  @Prop({ default: false })
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ActionSchema = SchemaFactory.createForClass(Action);

/* ================= INDEX CHO ML ================= */

// 1 user đã follow user khác 1 lần
ActionSchema.index(
  { actorId: 1, targetId: 1, actionType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      actionType: 'follow',
      isDeleted: false,
    },
  },
);

// ML quét theo actor
ActionSchema.index({ actorId: 1, createdAt: -1 });

// ML quét theo target
ActionSchema.index({ targetId: 1, createdAt: -1 });

// ML quét theo loại hành động
ActionSchema.index({ actionType: 1, createdAt: -1 });
