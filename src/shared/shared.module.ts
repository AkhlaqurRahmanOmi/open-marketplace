import { Module, Global } from '@nestjs/common';
import { TraceIdService } from './services/trace-id.service';
import { ResponseBuilderService } from './services/response-builder.service';
import { UnitOfWorkService } from './services/unit-of-work.service';
import { S3UploadService } from './services/s3-upload.service';

/**
 * Shared module containing common services, interceptors, and utilities
 * Made global to avoid importing in every module
 */
@Global()
@Module({
  providers: [
    TraceIdService,
    ResponseBuilderService,
    UnitOfWorkService,
    S3UploadService,
  ],
  exports: [
    TraceIdService,
    ResponseBuilderService,
    UnitOfWorkService,
    S3UploadService,
  ],
})
export class SharedModule {}
