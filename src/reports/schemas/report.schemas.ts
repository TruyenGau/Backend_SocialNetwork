import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type ReportDocument = HydratedDocument<Report>;

export enum ReportReason {
  OFFENSIVE_LANGUAGE = 'OFFENSIVE_LANGUAGE',
  VIOLENCE = 'VIOLENCE',
  SPAM = 'SPAM',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ReportAction {
  DELETE = 'DELETE',
  WARNING = 'WARNING',
  BAN = 'BAN',
  NONE = 'NONE',
}

@Schema({ timestamps: true })
export class Report {
  // ===== NGƯỜI BÁO CÁO =====
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  reporterId: mongoose.Schema.Types.ObjectId;

  // ===== ĐỐI TƯỢNG BỊ BÁO CÁO =====
  @Prop({ enum: ['POST', 'USER'], required: true })
  targetType: 'POST' | 'USER';

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  targetId: mongoose.Schema.Types.ObjectId;

  // ===== LÝ DO BÁO CÁO =====
  @Prop({ enum: ReportReason, required: true })
  reason: ReportReason;

  @Prop()
  description?: string;

  // ===== TRẠNG THÁI =====
  @Prop({
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  // ===== ADMIN XỬ LÝ =====
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  adminId?: mongoose.Schema.Types.ObjectId;

  @Prop({
    enum: ReportAction,
    default: ReportAction.NONE,
  })
  action: ReportAction;
  updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
