import { IsInt, IsArray, IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  notificationIds: number[];
}
