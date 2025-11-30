import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class OtpProvider {
  private readonly otpLength: number;
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(private readonly configService: ConfigService) {
    this.otpLength = Number(this.configService.get<string>('OTP_LENGTH', '6'));
    this.otpExpiryMinutes = Number(this.configService.get<string>('OTP_EXPIRY_MINUTES', '10'));
    this.maxAttempts = Number(this.configService.get<string>('OTP_MAX_ATTEMPTS', '3'));
  }

  /**
   * Generate a secure random OTP
   */
  generateOTP(): string {
    const digits = '0123456789';
    let otp = '';

    // Use crypto for secure random number generation
    const randomBytes = crypto.randomBytes(this.otpLength);

    for (let i = 0; i < this.otpLength; i++) {
      otp += digits[randomBytes[i] % 10];
    }

    return otp;
  }

  /**
   * Calculate expiry time for OTP
   */
  calculateExpiryTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + this.otpExpiryMinutes * 60 * 1000);
  }

  /**
   * Verify if OTP is expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Verify if max attempts exceeded
   */
  isMaxAttemptsExceeded(attempts: number): boolean {
    return attempts >= this.maxAttempts;
  }

  /**
   * Get OTP configuration
   */
  getConfig() {
    return {
      length: this.otpLength,
      expiryMinutes: this.otpExpiryMinutes,
      maxAttempts: this.maxAttempts,
    };
  }
}
