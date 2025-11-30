import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
} from 'class-validator';
import { NotificationChannel } from '../enums';

export class SendNotificationDto {
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  userIds?: number[];

  @IsString()
  @IsNotEmpty()
  event: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsNotEmpty()
  channels: NotificationChannel[];

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  templateName?: string;
}
