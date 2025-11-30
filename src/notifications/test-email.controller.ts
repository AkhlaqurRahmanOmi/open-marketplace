import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { EmailProvider } from './providers/email.provider';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';

class TestEmailDto {
  @IsEmail()
  email: string;
}

/**
 * Test Email Controller
 * Public endpoint for testing email functionality
 * Route: POST /api/test-email
 */
@Controller('test-email')
export class TestEmailController {
  private readonly logger = new Logger(TestEmailController.name);

  constructor(private readonly emailProvider: EmailProvider) {}

  @Post()
  @Auth(AuthType.None) // Public endpoint - no authentication required
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() dto: TestEmailDto) {
    this.logger.log(`=== EMAIL TEST STARTED ===`);
    this.logger.log(`Target email: ${dto.email}`);
    this.logger.log(`From email: ${this.emailProvider.getFromEmail()}`);

    try {
      const emailOptions = {
        to: dto.email,
        subject: 'Test Email from E-Commerce API',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #4CAF50; text-align: center;">✅ Email Test Successful!</h1>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Congratulations! Your email service is working correctly.
              </p>

              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #555;">Test Details:</h3>
                <ul style="color: #666;">
                  <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
                  <li><strong>API Version:</strong> 1.0.0</li>
                  <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
                </ul>
              </div>

              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                This is an automated test email from your E-Commerce API
              </p>
            </div>
          </div>
        `,
        text: `
          ✅ Email Test Successful!

          Congratulations! Your email service is working correctly.

          Test Details:
          - Timestamp: ${new Date().toLocaleString()}
          - API Version: 1.0.0
          - Environment: ${process.env.NODE_ENV}

          This is an automated test email from your E-Commerce API
        `,
      };

      this.logger.log(`Preparing to send email...`);
      this.logger.log(`Email subject: "${emailOptions.subject}"`);

      const result = await this.emailProvider.sendEmail(emailOptions);

      if (result) {
        this.logger.log(`✅ Email sent successfully to ${dto.email}`);
        this.logger.log(`=== EMAIL TEST COMPLETED SUCCESSFULLY ===`);

        return {
          success: true,
          message: `Test email sent successfully to ${dto.email}`,
          details: {
            recipient: dto.email,
            from: this.emailProvider.getFromEmail(),
            subject: emailOptions.subject,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          },
        };
      } else {
        this.logger.error(`❌ Failed to send email to ${dto.email}`);
        this.logger.log(`=== EMAIL TEST FAILED ===`);

        return {
          success: false,
          message: `Failed to send test email to ${dto.email}`,
          details: {
            recipient: dto.email,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error sending test email: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.logger.log(`=== EMAIL TEST FAILED WITH ERROR ===`);

      return {
        success: false,
        message: 'An error occurred while sending test email',
        error: error.message,
        details: {
          recipient: dto.email,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
