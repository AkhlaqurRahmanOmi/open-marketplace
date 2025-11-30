import { IsObject, IsNotEmpty } from 'class-validator';

/**
 * Generic DTO for updating any homepage section
 * Used for all 10 sections (banner, reviews, best-sellers, etc.)
 */
export class UpdateSectionDto {
  @IsObject()
  @IsNotEmpty()
  content: Record<string, any>;
}
