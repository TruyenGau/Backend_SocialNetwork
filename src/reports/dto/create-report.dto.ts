import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ReportReason } from '../schemas/report.schemas';

export class CreateReportDto {
  @IsEnum(['POST', 'USER'])
  targetType: 'POST' | 'USER';

  @IsMongoId()
  targetId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  description?: string;
}
