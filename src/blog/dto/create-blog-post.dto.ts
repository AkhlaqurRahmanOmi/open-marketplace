import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { BlogPostStatus } from '@prisma/client';

export class CreateBlogPostDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;
}
