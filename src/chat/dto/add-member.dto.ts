import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class AddMemberDto {
  @IsString()
  roomId: string;

  @IsArray()
  @ArrayNotEmpty()
  memberIds: string[];
}
