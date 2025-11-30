import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OtpCleanupTask } from './otp-cleanup.task';
import { NotificationCleanupTask } from './notification-cleanup.task';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Tasks Module
 * Central module for all scheduled tasks and cron jobs
 *
 * Add new scheduled tasks here:
 * 1. Create a new task file (e.g., my-task.task.ts)
 * 2. Add @Injectable() and use @Cron decorators
 * 3. Import required modules in imports array
 * 4. Add task to providers array
 *
 * Example task structure:
 * ```typescript
 * @Injectable()
 * export class MyTask {
 *   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
 *   async handleTask() {
 *     // Task logic here
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    NotificationsModule,
  ],
  providers: [
    OtpCleanupTask,
    NotificationCleanupTask,
    // Add more scheduled tasks here
  ],
})
export class TasksModule {}
