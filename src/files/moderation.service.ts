// src/files/moderation.service.ts
import { Injectable } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { google } from '@google-cloud/vision/build/protos/protos';
import { ConfigService } from '@nestjs/config';

const { Likelihood } = google.cloud.vision.v1;

@Injectable()
export class ModerationService {
  private client: ImageAnnotatorClient;

  constructor(private readonly configService: ConfigService) {
    const rawCreds = this.configService.get<string>(
      'GOOGLE_VISION_CREDENTIALS',
    );

    if (!rawCreds) {
      throw new Error('Missing GOOGLE_VISION_CREDENTIALS env');
    }

    const credentials = JSON.parse(rawCreds);

    this.client = new ImageAnnotatorClient({
      credentials,
    });
  }

  // =========================
  // Helper: normalize Likelihood
  // =========================
  private toLikelihood(
    v?: google.cloud.vision.v1.Likelihood | string,
  ): google.cloud.vision.v1.Likelihood {
    if (typeof v === 'number') return v;
    if (!v) return Likelihood.UNKNOWN;
    return Likelihood[v as keyof typeof Likelihood] ?? Likelihood.UNKNOWN;
  }

  // =========================
  // MAIN CHECK IMAGE (BUFFER)
  // =========================
  async checkImageBuffer(buffer: Buffer): Promise<{
    is_safe: boolean;
    reason?: string;
    unsafe_score?: any;
    labels?: string[];
    text_detected?: string;
  }> {
    try {
      const [result] = await this.client.annotateImage({
        image: {
          content: buffer.toString('base64'),
        },
        features: [
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'TEXT_DETECTION' },
        ],
      });

      const safe = result.safeSearchAnnotation;
      const labels = result.labelAnnotations || [];
      const texts = result.textAnnotations || [];

      let imageReason: string | undefined;

      // ================= SAFE SEARCH =================
      if (safe) {
        const adult = this.toLikelihood(safe.adult);
        const racy = this.toLikelihood(safe.racy);
        const violence = this.toLikelihood(safe.violence);
        const medical = this.toLikelihood(safe.medical);

        const isAdultUnsafe = (v: number) =>
          v === Likelihood.LIKELY || v === Likelihood.VERY_LIKELY;

        const isViolenceUnsafe = (v: number) =>
          v === Likelihood.POSSIBLE ||
          v === Likelihood.LIKELY ||
          v === Likelihood.VERY_LIKELY;

        if (isAdultUnsafe(adult)) imageReason = 'Chứa nội dung người lớn (18+)';
        else if (isViolenceUnsafe(violence))
          imageReason = 'Chứa nội dung bạo lực';
        else if (isAdultUnsafe(racy)) imageReason = 'Hình ảnh quá gợi cảm';
        else if (isViolenceUnsafe(medical))
          imageReason = 'Hình ảnh máu me / y tế';

        if (imageReason) {
          return {
            is_safe: false,
            reason: imageReason,
            unsafe_score: {
              adult: Likelihood[adult],
              racy: Likelihood[racy],
              violence: Likelihood[violence],
              medical: Likelihood[medical],
            },
          };
        }
      }

      // ================= LABEL CHECK =================
      const BLACKLIST_LABELS = [
        'blood',
        'weapon',
        'gun',
        'knife',
        'violence',
        'fight',
        'explosion',
      ];

      for (const label of labels) {
        const name = (label.description || '').toLowerCase();
        const score = label.score ?? 0;

        if (score > 0.7 && BLACKLIST_LABELS.some((b) => name.includes(b))) {
          return {
            is_safe: false,
            reason: `Phát hiện nội dung cấm: ${label.description}`,
            labels: labels.map((l) => l.description),
          };
        }
      }

      // ================= OCR CHECK =================
      const fullText = texts[0]?.description?.toLowerCase() || '';
      const BLACKLIST_TEXT = ['xxx', '18+', 'porn', 'sex', 'nsfw'];

      for (const bad of BLACKLIST_TEXT) {
        if (fullText.includes(bad)) {
          return {
            is_safe: false,
            reason: `Phát hiện chữ cấm trong ảnh: "${bad}"`,
            text_detected: fullText,
          };
        }
      }

      // ================= SAFE =================
      return {
        is_safe: true,
        labels: labels.map((l) => l.description),
      };
    } catch (err: any) {
      console.error('Vision API error:', err.message);

      // DEV MODE: không block user
      return { is_safe: true };

      // PROD STRICT (nếu muốn):
      // return { is_safe: false, reason: 'IMAGE_MODERATION_ERROR' };
    }
  }
}
