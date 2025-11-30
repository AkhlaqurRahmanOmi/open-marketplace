import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MoveToCartDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number = 1;
}
