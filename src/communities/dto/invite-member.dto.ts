import { IsArray, IsMongoId } from 'class-validator';

export class InviteMembersDto {
  @IsArray()
  @IsMongoId({ each: true })
  userIds: string[];
}
