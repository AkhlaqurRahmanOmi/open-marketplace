import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
  PaymentCallbackResponse,
} from '../interfaces/payment-gateway.interface';
import { Pesapal } from 'pesapal3-sdk';

@Injectable()
export class PesapalProvider implements IPaymentGateway {
  private readonly logger = new Logger(PesapalProvider.name);
  private pesapal: any;
  private ipnUrl: string;
  private callbackUrl: string;

  constructor(private configService: ConfigService) {
    const consumerKey = this.configService.get<string>('PESAPAL_CONSUMER_KEY') || '';
    const consumerSecret = this.configService.get<string>(
      'PESAPAL_CONSUMER_SECRET',
    ) || '';
    const environment = this.configService.get<string>(
      'PESAPAL_ENVIRONMENT',
      'sandbox',
    ) || 'sandbox';

    this.ipnUrl = this.configService.get<string>('PESAPAL_IPN_URL') || '';
    this.callbackUrl = this.configService.get<string>('PESAPAL_CALLBACK_URL') || '';

    // Initialize Pesapal SDK
    this.pesapal = new Pesapal({
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      environment: environment as 'sandbox' | 'production',
    } as any);

    this.logger.log(`Pesapal initialized in ${environment} mode`);
  }

  getGatewayName(): string {
    return 'pesapal';
  }

  async initiatePayment(
    orderId: number,
    amount: number,
    currency: string,
    metadata: any,
  ): Promise<PaymentInitiateResponse> {
    try {
      this.logger.log(
        `Initiating Pesapal payment for order ${orderId}, amount: ${amount} ${currency}`,
      );

      // Register IPN if not already registered
      await this.registerIPN();

      // Submit order request
      const orderRequest = {
        id: `ORDER-${orderId}-${Date.now()}`,
        currency: currency,
        amount: amount,
        description: metadata?.description || `Payment for Order #${orderId}`,
        callback_url: this.callbackUrl,
        notification_id: await this.getIPNId(),
        billing_address: {
          email_address: metadata?.email,
          phone_number: metadata?.phoneNumber,
          country_code: metadata?.countryCode || 'KE',
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          line_1: metadata?.address || '',
          line_2: metadata?.address2 || '',
          city: metadata?.city || '',
          state: metadata?.state || '',
          postal_code: metadata?.postalCode || '',
        },
      };

      const response = await this.pesapal.submitOrderRequest(orderRequest);

      if (response.status === '200' && response.redirect_url) {
        return {
          success: true,
          redirectUrl: response.redirect_url,
          transactionId: response.order_tracking_id,
          message: 'Payment initiated successfully',
          metadata: response,
        };
      }

      throw new Error(response.message || 'Failed to initiate payment');
    } catch (error) {
      this.logger.error(
        `Failed to initiate Pesapal payment: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        transactionId: '',
        message: error.message,
      };
    }
  }

  async verifyPayment(
    transactionId: string,
  ): Promise<PaymentVerifyResponse> {
    try {
      this.logger.log(`Verifying Pesapal payment: ${transactionId}`);

      const response =
        await this.pesapal.getTransactionStatus(transactionId);

      if (response.status === '200') {
        const status = this.mapPesapalStatus(response.payment_status_description);

        return {
          success: true,
          status,
          transactionId: response.order_tracking_id,
          amount: response.amount,
          currency: response.currency,
          message: response.payment_status_description,
          metadata: response,
        };
      }

      throw new Error(response.message || 'Failed to verify payment');
    } catch (error) {
      this.logger.error(
        `Failed to verify Pesapal payment: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        status: 'failed',
        transactionId,
        message: error.message,
      };
    }
  }

  async handleCallback(payload: any): Promise<PaymentCallbackResponse> {
    try {
      this.logger.log('Processing Pesapal callback');

      const { OrderTrackingId, OrderMerchantReference } = payload;

      // Verify the transaction status
      const verifyResponse = await this.verifyPayment(OrderTrackingId);

      if (!verifyResponse.success) {
        throw new Error('Payment verification failed');
      }

      // Extract order ID from merchant reference
      const orderId = this.extractOrderId(OrderMerchantReference);

      return {
        success: true,
        transactionId: OrderTrackingId,
        orderId: orderId ?? undefined,
        status: verifyResponse.status,
        amount: verifyResponse.amount,
        message: verifyResponse.message,
        metadata: verifyResponse.metadata,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process Pesapal callback: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        transactionId: payload?.OrderTrackingId,
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Register IPN URL with Pesapal
   */
  private async registerIPN(): Promise<void> {
    try {
      const ipnResponse = await this.pesapal.registerIPN({
        url: this.ipnUrl,
        ipn_notification_type: 'POST',
      });

      if (ipnResponse.status !== '200') {
        this.logger.warn('Failed to register IPN, it might already be registered');
      }
    } catch (error) {
      this.logger.warn(`IPN registration failed: ${error.message}`);
    }
  }

  /**
   * Get IPN ID from Pesapal
   */
  private async getIPNId(): Promise<string> {
    try {
      const ipnList = await this.pesapal.getIPNList();

      if (ipnList.status === '200' && ipnList.data && ipnList.data.length > 0) {
        // Return the first IPN ID (or you can filter by URL)
        return ipnList.data[0].ipn_id;
      }

      throw new Error('No IPN registered');
    } catch (error) {
      this.logger.error(`Failed to get IPN ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Pesapal payment status to our internal status
   */
  private mapPesapalStatus(
    pesapalStatus: string,
  ): 'pending' | 'authorized' | 'captured' | 'failed' | 'voided' {
    const statusMap = {
      'PENDING': 'pending',
      'COMPLETED': 'captured',
      'FAILED': 'failed',
      'INVALID': 'failed',
      'REVERSED': 'voided',
    };

    return (statusMap[pesapalStatus?.toUpperCase()] || 'pending') as any;
  }

  /**
   * Extract order ID from merchant reference
   */
  private extractOrderId(reference: string): number | null {
    try {
      // Extract number from format like "ORDER-123-1234567890"
      const match = reference.match(/ORDER-(\d+)-/);
      return match ? parseInt(match[1], 10) : null;
    } catch {
      return null;
    }
  }
}
