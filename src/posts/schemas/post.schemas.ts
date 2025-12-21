import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Post {
  @Prop()
  namePost: string;

  @Prop()
  content: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Community' })
  communityId: mongoose.Schema.Types.ObjectId;

  // Bộ đếm like để đọc nhanh
  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;

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
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;
  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: null })
  pinnedAt: Date | null;

  @Prop({
    enum: ['APPROVED', 'PENDING', 'REJECTED'],
    default: 'APPROVED',
  })
  status: 'APPROVED' | 'PENDING' | 'REJECTED';

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Post.name,
    default: null,
  })
  sharedPostId: mongoose.Schema.Types.ObjectId | null;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: User.name,
    default: [],
  })
  taggedUserIds: mongoose.Schema.Types.ObjectId[];

  @Prop({
    enum: ['NORMAL', 'BIRTHDAY'],
    default: 'NORMAL',
  })
  postType: 'NORMAL' | 'BIRTHDAY';
}

export const PostSchema = SchemaFactory.createForClass(Post);
