import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string | undefined;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('storage.s3.region') || 'us-east-1';
    this.endpoint = this.configService.get<string>('storage.s3.endpoint');
    const credentials = this.configService.get('storage.s3.credentials');
    const forcePathStyle = this.configService.get<boolean>('storage.s3.forcePathStyle');

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials,
      forcePathStyle,
    });

    this.bucketName = this.configService.get<string>('storage.s3.bucketName') || '';
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${folder}/${uuidv4()}${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
        },
      });

      await this.s3Client.send(command);

      // Generate file URL based on whether we're using custom endpoint or AWS S3
      const fileUrl = this.generateFileUrl(fileName);

      this.logger.log(`File uploaded successfully: ${fileName}`);

      return {
        fileUrl,
        fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to S3');
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const fileName = this.extractFileKeyFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${fileName}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${error.message}`,
        error.stack,
      );
      // Don't throw error to allow operation to continue
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(fileUrls: string[]): Promise<void> {
    const deletePromises = fileUrls.map((url) => this.deleteFile(url));
    await Promise.all(deletePromises);
  }

  /**
   * Generate file URL based on S3 endpoint configuration
   */
  private generateFileUrl(fileName: string): string {
    if (this.endpoint) {
      // Custom S3-compatible endpoint (Synology C2, Cloudflare R2, etc.)
      // Path-style URL: https://endpoint/bucket/key
      return `${this.endpoint}/${this.bucketName}/${fileName}`;
    } else {
      // Standard AWS S3 virtual-hosted-style URL
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    }
  }

  /**
   * Extract S3 key from full URL
   * Handles both AWS S3 and custom endpoint URLs
   */
  private extractFileKeyFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    const pathname = url.pathname.substring(1); // Remove leading slash

    if (this.endpoint) {
      // Custom endpoint: URL format is https://endpoint/bucket/key
      // Remove bucket name from path
      const bucketPrefix = `${this.bucketName}/`;
      if (pathname.startsWith(bucketPrefix)) {
        return pathname.substring(bucketPrefix.length);
      }
    }

    // AWS S3 or already just the key
    return pathname;
  }
}
