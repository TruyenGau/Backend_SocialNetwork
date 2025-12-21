import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Role } from 'src/roles/schema/role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({})
  email: string;

  @Prop()
  name: string;

  @Prop()
  password: string;

  @Prop()
  age: number;

  @Prop()
  phoneNumber: string;

  @Prop()
  description: string;

  @Prop()
  school: string;

  @Prop()
  work: string;

  @Prop()
  gender: string; // sex

  @Prop()
  address: string;

  @Prop()
  avatar: string;

  @Prop()
  coverPhoto: string;

  @Prop()
  type: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
    default: [],
  })
  communities: mongoose.Schema.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    default: [],
  })
  savedPosts: mongoose.Schema.Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Role.name })
  role: mongoose.Schema.Types.ObjectId;

  @Prop()
  refreshToken: string;

  @Prop({ default: false, index: true })
  online: boolean;

  @Prop({ type: Date, default: null })
  lastActive: Date;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: false })
  block: boolean;
  @Prop({ type: Date })
  birthday: Date;

  // user.schema.ts (CHỈ THÊM PHẦN NÀY)
  @Prop({ default: 0 })
  spamScore: number;

  @Prop({ default: false, index: true })
  isSpamSuspected: boolean;

  @Prop({ default: null })
  spamReason: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
