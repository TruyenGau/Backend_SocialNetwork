import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type CommunityDocument = HydratedDocument<Community>;

@Schema({ timestamps: true })
export class Community {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  avatar: string;

  @Prop()
  coverPhoto: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }],
    default: [],
  })
  members: mongoose.Schema.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }],
    default: [],
  })
  admins: mongoose.Schema.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  invitedUsers: Types.ObjectId[];

  @Prop({
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC',
  })
  visibility: 'PUBLIC' | 'PRIVATE';

  @Prop({ default: 0 })
  membersCount: number;

  @Prop({ default: 0 })
  postsCount: number;

  @Prop({ type: Object })
  createdBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop({ type: Object })
  updatedBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop({ type: Object })
  deletedBy: { _id: mongoose.Schema.Types.ObjectId; email: string };

  @Prop()
  createdAt: Date;
  @Prop()
  updatedAt: Date;
  @Prop()
  deletedAt: Date;
  @Prop()
  isDeleted: boolean;
}

export const CommunitySchema = SchemaFactory.createForClass(Community);
