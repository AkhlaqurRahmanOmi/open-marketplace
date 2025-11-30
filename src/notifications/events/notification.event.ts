import { NotificationChannel } from '../enums';

export class NotificationEvent {
  userId?: number;
  userIds?: number[];
  event: string;
  channels: NotificationChannel[];
  title?: string;
  message?: string;
  data?: Record<string, any>;
  templateName?: string;
}
