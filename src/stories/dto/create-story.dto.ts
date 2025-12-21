import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStoryDto {
  @IsNotEmpty()
  @IsString()
  image: string; // link ảnh story
}
