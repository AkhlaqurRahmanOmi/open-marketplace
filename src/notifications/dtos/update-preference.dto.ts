import {
  IsInt,
  IsString,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { NotificationChannel } from '../enums';

export class UpdatePreferenceDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  event: string;

  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel: NotificationChannel;

  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}
