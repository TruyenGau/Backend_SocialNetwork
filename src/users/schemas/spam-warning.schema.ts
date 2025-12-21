import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type SpamWarningDocument = HydratedDocument<SpamWarning>;

@Schema({ timestamps: true })
export class SpamWarning {
  // user bị cảnh cáo
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

  // admin thực hiện cảnh cáo
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  adminId: mongoose.Schema.Types.ObjectId;

  // nội dung cảnh cáo (admin nhập)
  @Prop({ required: true })
  message: string;
}

export const SpamWarningSchema = SchemaFactory.createForClass(SpamWarning);
