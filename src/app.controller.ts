import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import {Auth} from "./auth/decorator/auth.decorator";
import {AuthType} from "./auth/enums/auth-type.enum";
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { S3UploadService } from './shared/services/s3-upload.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly s3UploadService: S3UploadService) {}

    @Auth(AuthType.None)
  @Get('/')
  getHello(): string {
    return this.appService.getHello();
  }

  @Auth(AuthType.None)
  @Post('/test-s3')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Test S3 connection by uploading a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'S3 connection successful' })
  @ApiResponse({ status: 400, description: 'No file provided or upload failed' })
  async testS3Upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const result = await this.s3UploadService.uploadFile(file, 'test');
      return {
        message: 'S3 connection successful!',
        uploadResult: result,
      };
    } catch (error) {
      throw new BadRequestException(`S3 upload failed: ${error.message}`);
    }
  }
}
