import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  memberIds: string[]; 
}
