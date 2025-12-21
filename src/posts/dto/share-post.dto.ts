import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class SharePostDto {
  @IsMongoId()
  postId: string; // post gốc

  @IsOptional()
  @IsString()
  content?: string; // caption khi share
}
