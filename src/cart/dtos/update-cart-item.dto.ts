import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}
