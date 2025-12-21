import { IsEnum } from 'class-validator';
import { ReportAction } from '../schemas/report.schemas';

export class ResolveReportDto {
  @IsEnum(ReportAction)
  action: ReportAction;
}
