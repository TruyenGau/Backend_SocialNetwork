import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsMongoId()
  communityId: string;

  @IsOptional()
  @IsDateString()
  expiredAt?: string; // ✅ string ISO
}
