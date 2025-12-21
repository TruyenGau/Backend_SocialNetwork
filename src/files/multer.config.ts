import { Injectable } from '@nestjs/common';
import {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  getRootPath = () => process.cwd();

  ensureExistsSync(dir: string) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // log nếu cần
      // console.error(e);
    }
  }

  createMulterOptions(): MulterModuleOptions {
    return {
      storage: diskStorage({
        destination: (req: Request, file, cb) => {
          const folder = (req.headers?.folder_type as string) ?? 'default';
          const isVideo = file.mimetype.startsWith('video/');

          // Tạo trước 2 subfolder: images và videos dưới public/<folder>
          const baseFolder = path.join(this.getRootPath(), 'public', folder);
          const imagesDir = path.join(baseFolder, 'images');
          const videosDir = path.join(baseFolder, 'videos');
          this.ensureExistsSync(imagesDir);
          this.ensureExistsSync(videosDir);

          // Đích đến theo loại file
          const dest = isVideo ? videosDir : imagesDir;
          cb(null, dest);
        },

        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const base = path
            .basename(file.originalname, ext)
            .replace(/[^\w\-]+/g, '_');
          cb(null, `${base}-${Date.now()}${ext}`);
        },
      }),

      limits: {
        files: 20,
        fileSize: 20 * 1024 * 1024, // 20MB/file
      },

      fileFilter: (req, file, cb) => {
        if (
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/')
        ) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed: ${file.mimetype}`), false);
        }
      },
    };
  }
}
