import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly configService: ConfigService) {}

  transform(value: Express.Multer.File | Express.Multer.File[]) {
    if (!value) {
      throw new BadRequestException('No file uploaded');
    }

    const files = Array.isArray(value) ? value : [value];
    const maxFileSize = this.configService.get<number>('storage.upload.maxFileSize') || 5242880;
    const allowedTypes = this.configService.get<string[]>('storage.upload.allowedImageTypes') || ['jpg', 'jpeg', 'png', 'webp'];

    for (const file of files) {
      // Validate file size
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File ${file.originalname} exceeds maximum size of ${maxFileSize / 1024 / 1024}MB`,
        );
      }

      // Validate file type by MIME type
      const fileExtension = file.mimetype.split('/')[1];
      if (!allowedTypes.includes(fileExtension)) {
        throw new BadRequestException(
          `File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        );
      }
    }

    return value;
  }
}
