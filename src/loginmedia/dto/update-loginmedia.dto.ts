import { PartialType } from '@nestjs/swagger';
import { CreateLoginmediaDto } from './create-loginmedia.dto';

export class UpdateLoginmediaDto extends PartialType(CreateLoginmediaDto) {}
