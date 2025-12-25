import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Community } from 'src/communities/schemas/community.schema';

export type PollDocument = HydratedDocument<Poll>;

@Schema({ timestamps: true })
export class Poll {
  @Prop({ required: true })
  question: string;

  @Prop({
    type: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
        voters: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }],
      },
    ],
    required: true,
  })
  options: {
    text: string;
    votes: number;
    voters: Types.ObjectId[];
  }[];

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Community.name,
    required: true,
  })
  communityId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiredAt?: Date;
}

export const PollSchema = SchemaFactory.createForClass(Poll);
