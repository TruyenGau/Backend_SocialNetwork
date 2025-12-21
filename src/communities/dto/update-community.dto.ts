import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCommunityDto } from './create-community.dto';
import { IsMongoId } from 'class-validator';

export class UpdateCommunityDto extends PartialType(
  OmitType(CreateCommunityDto, [] as const),
) {}
