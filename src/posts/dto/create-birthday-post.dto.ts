import { IsMongoId, IsString } from 'class-validator';

export class CreateBirthdayPostDto {
  @IsString()
  content: string;

  @IsMongoId()
  targetUserId: string; // người được chúc
}
