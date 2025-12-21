import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type FollowDocument = HydratedDocument<Follow>;
@Schema({ timestamps: true })
export class Follow {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  follower: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  following: mongoose.Schema.Types.ObjectId;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);
