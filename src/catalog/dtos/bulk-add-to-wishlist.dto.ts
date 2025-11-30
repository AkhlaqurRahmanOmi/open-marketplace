import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { AddToWishlistDto } from './add-to-wishlist.dto';

export class BulkAddToWishlistItemDto extends AddToWishlistDto {}

export class BulkAddToWishlistDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAddToWishlistItemDto)
  items!: BulkAddToWishlistItemDto[];
}
