import { registerAs } from '@nestjs/config';

/**
 * Storage configuration for S3 and file uploads
 * Contains AWS S3 credentials and upload settings
 */
export default registerAs('storage', () => ({
  // AWS S3 Configuration
  s3: {
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT, // Custom S3-compatible endpoint (Synology C2, Cloudflare R2, etc.)
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    bucketName: process.env.S3_BUCKET_NAME,
    forcePathStyle: !!process.env.AWS_ENDPOINT, // Required for custom S3-compatible endpoints
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || [
      'jpg',
      'jpeg',
      'png',
      'webp',
    ],
    maxImagesPerReview: parseInt(process.env.MAX_IMAGES_PER_REVIEW || '5', 10),
  },
}));
