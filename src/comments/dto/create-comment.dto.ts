import { Optional } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import mongoose from 'mongoose';

export class CreateCommentDto {
  @Optional()
  @IsMongoId({ message: 'PostId có định dạng là mongo id' })
  @IsNotEmpty({ message: 'PostId không được để trống' })
  postId?: mongoose.Schema.Types.ObjectId;

  @IsString()
  @IsNotEmpty({ message: 'Content không được để trống' })
  content: string;

  @IsOptional()
  @IsMongoId({ message: 'ParentId có định dạng là mongo id' })
  parentId?: mongoose.Schema.Types.ObjectId;
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Content không được để trống' })
  content: string;
}
