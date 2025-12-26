import { Optional } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import mongoose from 'mongoose';

export class CreatePostDto {
  @Optional()
  namePost?: string;

  @IsNotEmpty({ message: 'Content không được để trống' })
  content: string;

  // Có thể upload nhiều ảnh hoặc video — không bắt buộc nếu bài viết chỉ có text
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsNotEmpty({ message: 'UserId không được để trống' })
  @IsMongoId({ message: 'UserId có định dạng là mongo id' })
  userId: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'communityId phải là MongoId' })
  communityId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsBoolean()
  aiFlag?: boolean;

  @IsOptional()
  @IsString()
  aiReason?: string;
}
