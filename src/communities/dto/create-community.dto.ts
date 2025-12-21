import {
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import mongoose from 'mongoose';

export class CreateCommunityDto {
  @IsNotEmpty({ message: 'Tên nhóm không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true, message: 'adminIds phải là mảng MongoId' })
  admins?: mongoose.Schema.Types.ObjectId[];

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';
}
