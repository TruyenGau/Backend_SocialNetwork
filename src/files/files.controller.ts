// src/files/files.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  Public,
  ResponseMessage,
  SkipCheckPermission,
} from 'src/auth/decorator/customize';
import { ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import { ModerationService } from './moderation.service';

import multer from 'multer';
import { CloudinaryProvider } from 'src/cloudinary/cloudinary.config';
import { resolveCloudinaryFolder } from './file-folder.helper';
@ApiTags('file')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly moderationService: ModerationService,
    @Inject('CLOUDINARY') private readonly cloudinary,
  ) {}

  // --- Single (giữ nguyên, nhưng mình trả về theo đúng loại) ---
  @ResponseMessage('upload single file')
  @Post('upload')
  @UseInterceptors(FileInterceptor('fileUpload'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    return {
      images: isImage ? [file.filename] : [],
      videos: isVideo ? [file.filename] : [],
    };
  }

  // --- Multi (1..N ảnh/video, trộn lẫn) ---
  // @SkipCheckPermission()
  // @Public()
  // @ResponseMessage('upload media (images/videos)')
  // @Post('upload-media')
  // @UseInterceptors(FilesInterceptor('media', 20))
  // async uploadMedia(
  //   @UploadedFiles() files: Express.Multer.File[],
  //   @Req() req: Request,
  // ) {
  //   if (!files || files.length === 0) {
  //     return {
  //       success: false,
  //       message: 'Không có file nào được upload',
  //     };
  //   }

  //   const folderType = (req.headers['folder_type'] as string) ?? 'misc';

  //   const images: string[] = [];
  //   const videos: string[] = [];

  //   for (const file of files) {
  //     const isImage = file.mimetype.startsWith('image/');
  //     const isVideo = file.mimetype.startsWith('video/');

  //     // ======================
  //     // IMAGE → CHECK AI
  //     // ======================
  //     if (isImage) {
  //       const result = await this.moderationService.checkImage(file.path);

  //       if (!result.is_safe) {
  //         // ❌ Xoá toàn bộ file đã upload
  //         for (const f of files) {
  //           if (fs.existsSync(f.path)) {
  //             fs.unlinkSync(f.path);
  //           }
  //         }

  //         return {
  //           success: false,
  //           message:
  //             result.reason ?? 'Ảnh không hợp lệ theo tiêu chuẩn cộng đồng',
  //           unsafe_score: result.unsafe_score,
  //         };
  //       }

  //       images.push(`uploads/${folderType}/images/${file.filename}`);
  //     }

  //     // ======================
  //     // VIDEO
  //     // ======================
  //     else if (isVideo) {
  //       videos.push(`uploads/${folderType}/videos/${file.filename}`);
  //     }

  //     // ======================
  //     // FILE KHÁC
  //     // ======================
  //     else {
  //       if (fs.existsSync(file.path)) {
  //         fs.unlinkSync(file.path);
  //       }
  //     }
  //   }

  //   return {
  //     success: true,
  //     images,
  //     videos,
  //   };
  // }

  @SkipCheckPermission()
  @Public()
  @ResponseMessage('upload media (images/videos)')
  @Post('upload-media')
  @UseInterceptors(FilesInterceptor('media', 20))
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      return {
        success: false,
        message: 'Không có file nào được upload',
      };
    }

    const folderType = (req.headers['folder_type'] as string) ?? 'misc';

    const images: string[] = [];
    const videos: string[] = [];

    // 🔑 FLAG TỔNG
    let aiFlag = false;
    let aiReason: string | null = null;
    let unsafeScore: number | null = null;

    for (const file of files) {
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');

      // ======================
      // IMAGE → CHECK AI
      // ======================
      if (isImage) {
        const result = await this.moderationService.checkImage(file.path);

        images.push(`uploads/${folderType}/images/${file.filename}`);

        if (!result.is_safe) {
          aiFlag = true;
          aiReason = result.reason ?? 'Image flagged by AI';
          unsafeScore = result.unsafe_score ?? null;
        }
      }

      // ======================
      // VIDEO
      // ======================
      else if (isVideo) {
        videos.push(`uploads/${folderType}/videos/${file.filename}`);
      }

      // ======================
      // FILE KHÁC
      // ======================
      else {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    return {
      success: true,
      images,
      videos,
      aiFlag,
      aiReason,
      unsafe_score: unsafeScore,
    };
  }

  //adfdfdd
  // @SkipCheckPermission()
  // @Public()
  // @ResponseMessage('upload media (images/videos)')
  // @Post('upload-media')
  // @UseInterceptors(
  //   FilesInterceptor('media', 20, {
  //     storage: multer.memoryStorage(),
  //   }),
  // )
  // async uploadMedia(
  //   @UploadedFiles() files: Express.Multer.File[],
  //   @Req() req: Request,
  // ) {
  //   const folderType = (req.headers['folder_type'] as string) ?? 'misc';

  //   const images: string[] = [];
  //   const videos: string[] = [];

  //   for (const file of files) {
  //     const { folder, resourceType } = resolveCloudinaryFolder(
  //       folderType,
  //       file.mimetype,
  //     );

  //     // ===== IMAGE → CHECK AI =====
  //     if (resourceType === 'image') {
  //       const result = await this.moderationService.checkImageBuffer(
  //         file.buffer,
  //       );

  //       if (!result.is_safe) {
  //         return {
  //           success: false,
  //           message: result.reason,
  //           unsafe_score: result.unsafe_score,
  //         };
  //       }
  //     }

  //     // ===== UPLOAD CLOUDINARY =====
  //     const upload = await new Promise<any>((resolve, reject) => {
  //       const stream = this.cloudinary.uploader.upload_stream(
  //         {
  //           folder,
  //           resource_type: resourceType,
  //         },
  //         (err, res) => (err ? reject(err) : resolve(res)),
  //       );
  //       stream.end(file.buffer);
  //     });

  //     if (resourceType === 'image') {
  //       images.push(upload.secure_url);
  //     } else {
  //       videos.push(upload.secure_url);
  //     }
  //   }

  //   return {
  //     success: true,
  //     images,
  //     videos,
  //   };
  // }

  // // --- Các API mẫu còn lại ---
  // @Get()
  // findAll() {
  //   return this.filesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.filesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
  //   return this.filesService.update(+id, updateFileDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.filesService.remove(+id);
  // }
}
