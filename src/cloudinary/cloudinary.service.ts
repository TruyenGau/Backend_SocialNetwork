// import { BadRequestException } from '@nestjs/common';
// import cloudinary from './cloudinary.config';

// export class CloudinaryService {
//   async uploadImage(filePath: string) {
//     const result = await cloudinary.uploader.upload(filePath, {
//       folder: 'posts',
//       moderation: 'aws_rek',
//     });

//     // 🔥 Định nghĩa type moderation
//     interface ModerationResult {
//       status: string;
//       confidence: number;
//       moderation: string;
//     }

//     // 🔥 Cloudinary không khai báo đúng type → ép về unknown
//     const moderationRaw = result.moderation?.[0] as unknown;

//     // 🔥 Cast sang type đúng
//     const review = moderationRaw as ModerationResult | null;

//     // 🔥 Kiểm duyệt ảnh
//     if (review && review.status === 'rejected') {
//       throw new BadRequestException(
//         `Ảnh bị từ chối do chứa nội dung nhạy cảm (Mức độ: ${review.confidence}%)`,
//       );
//     }

//     return result.secure_url;
//   }
// }
