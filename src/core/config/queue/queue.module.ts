import { Module, Global, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * QueueModule
 *
 * Global module that provides BullMQ queue infrastructure.
 * This module only sets up the Redis connection for BullMQ.
 * Individual queues should be registered in their respective feature modules.
 *
 * Architecture:
 * - This module: Global BullMQ configuration (Redis connection)
 * - Feature modules: Register specific queues and processors
 *
 * Usage in feature modules:
 *
 * @example
 * ```typescript
 * // notifications.module.ts
 * import { BullModule } from '@nestjs/bullmq';
 *
 * @Module({
 *   imports: [
 *     BullModule.registerQueue({
 *       name: 'email',
 *       defaultJobOptions: {
 *         attempts: 3,
 *         backoff: { type: 'exponential', delay: 1000 },
 *         removeOnComplete: true,
 *         removeOnFail: false,
 *       },
 *     }),
 *   ],
 *   providers: [EmailProcessor, NotificationsService],
 * })
 * export class NotificationsModule {}
 * ```
 *
 * @example
 * ```typescript
 * // email.processor.ts
 * import { Processor, WorkerHost } from '@nestjs/bullmq';
 * import { Job } from 'bullmq';
 *
 * @Processor('email')
 * export class EmailProcessor extends WorkerHost {
 *   async process(job: Job<EmailJobData>) {
 *     switch (job.name) {
 *       case 'send-otp':
 *         return this.sendOtpEmail(job.data);
 *       case 'order-confirmation':
 *         return this.sendOrderConfirmation(job.data);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // notifications.service.ts - Adding jobs to queue
 * import { InjectQueue } from '@nestjs/bullmq';
 * import { Queue } from 'bullmq';
 *
 * @Injectable()
 * export class NotificationsService {
 *   constructor(@InjectQueue('email') private emailQueue: Queue) {}
 *
 *   async sendOtpEmail(email: string, otp: string) {
 *     await this.emailQueue.add('send-otp', { email, otp }, {
 *       priority: 1, // High priority
 *       delay: 0,
 *     });
 *   }
 * }
 * ```
 *
 * Common Queue Names (suggestions for your project):
 * - 'email': Email notifications (OTP, order confirmations, etc.)
 * - 'notification': Push/in-app notifications
 * - 'order': Order processing tasks
 * - 'inventory': Inventory sync and updates
 * - 'report': Report generation
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('QueueModule');
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');
        const db = configService.get<number>('redis.db');

        logger.log(`Configuring BullMQ with Redis at ${host}:${port}, DB: ${db}`);

        const connectionConfig: any = {
          host,
          port,
          db,
          maxRetriesPerRequest: configService.get<number>('redis.maxRetriesPerRequest'),
          connectTimeout: configService.get<number>('redis.connectTimeout'),
        };

        // Only add password if it's actually set (not empty string)
        if (password && password.trim() !== '') {
          connectionConfig.password = password;
        }

        return {
          connection: connectionConfig,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: {
              count: 100, // Keep last 100 completed jobs
              age: 24 * 60 * 60, // Keep for 24 hours
            },
            removeOnFail: {
              count: 500, // Keep last 500 failed jobs for debugging
              age: 7 * 24 * 60 * 60, // Keep for 7 days
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

