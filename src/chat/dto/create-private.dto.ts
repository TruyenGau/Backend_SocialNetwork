import { IsString } from 'class-validator';

export class CreatePrivateDto {
  @IsString()
  otherUserId: string;
}
