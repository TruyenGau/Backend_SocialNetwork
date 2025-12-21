import { IsMongoId } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class UpdateUserDto extends OmitType(CreateUserDto, [
  'password',
] as const) {
  @IsMongoId({ message: '_id không đúng định dạng' })
  _id: string;
}
