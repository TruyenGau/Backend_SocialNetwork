import { IsOptional, IsNumberString } from 'class-validator';

export class GetMessagesDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
