import { IsOptional, IsEnum, IsString } from 'class-validator';
import { BlogPostStatus } from '@prisma/client';

export class BlogPostQueryDto {
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
