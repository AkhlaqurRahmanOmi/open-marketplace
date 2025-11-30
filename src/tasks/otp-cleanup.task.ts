import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpRepository } from '../auth/repositories/otp.repository';

/**
 * Scheduled task to cleanup expired OTP records
 * Runs daily at 2:00 AM to remove expired and used OTPs
 */
@Injectable()
export class OtpCleanupTask {
  private readonly logger = new Logger(OtpCleanupTask.name);

  constructor(private readonly otpRepository: OtpRepository) {}

  /**
   * Cleanup expired OTPs
   * Runs every day at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredOtps() {
    this.logger.log('Starting OTP cleanup task...');

    try {
      const deletedCount = await this.otpRepository.deleteExpired();

      this.logger.log(
        `OTP cleanup completed. Deleted ${deletedCount} expired OTP records`,
      );
    } catch (error) {
      this.logger.error(
        `OTP cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Alternative: Run every hour for more frequent cleanup
   * Uncomment if you want more frequent cleanup
   */
  // @Cron(CronExpression.EVERY_HOUR)
  // async cleanupExpiredOtpsHourly() {
  //   this.logger.debug('Running hourly OTP cleanup...');
  //   try {
  //     const deletedCount = await this.otpRepository.deleteExpired();
  //     if (deletedCount > 0) {
  //       this.logger.log(
  //         `Hourly cleanup: Deleted ${deletedCount} expired OTP records`,
  //       );
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `Hourly OTP cleanup failed: ${error.message}`,
  //       error.stack,
  //     );
  //   }
  // }
}
