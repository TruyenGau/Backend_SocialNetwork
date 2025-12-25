import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.config';
import { ModerationService } from './moderation.service';
import { CloudinaryProvider } from 'src/cloudinary/cloudinary.config';

@Module({
  controllers: [FilesController],
  providers: [FilesService, ModerationService, CloudinaryProvider],
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
  ],
})
export class FilesModule {}
