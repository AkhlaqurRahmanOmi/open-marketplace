import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class UpdateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}
