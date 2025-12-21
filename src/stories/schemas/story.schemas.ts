import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StoryDocument = HydratedDocument<Story>;

@Schema({ timestamps: true })
export class Story {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  image: string;

  @Prop({
    type: Date,
    default: () => new Date(),
    expires: 60 * 60 * 24, // Story tự xoá sau 24h
  })
  expireAt: Date;
}

export const StorySchema = SchemaFactory.createForClass(Story);
