import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IPaymentGateway,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
  PaymentCallbackResponse,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class MpesaProvider implements IPaymentGateway {
  private readonly logger = new Logger(MpesaProvider.name);
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private businessShortCode: string;
  private passKey: string;
  private callbackUrl: string;
  private environment: string;

  constructor(private configService: ConfigService) {
    this.consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY') || '';
    this.consumerSecret = this.configService.get<string>(
      'MPESA_CONSUMER_SECRET',
    ) || '';
    this.businessShortCode = this.configService.get<string>(
      'MPESA_BUSINESS_SHORT_CODE',
    ) || '';
    this.passKey = this.configService.get<string>('MPESA_PASS_KEY') || '';
    this.callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL') || '';
    this.environment = this.configService.get<string>(
      'MPESA_ENVIRONMENT',
      'sandbox',
    ) || 'sandbox';

    // Set base URL based on environment
    this.baseUrl =
      this.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    this.logger.log(`M-Pesa initialized in ${this.environment} mode`);
  }

  getGatewayName(): string {
    return 'mpesa';
  }

  async initiatePayment(
    orderId: number,
    amount: number,
    currency: string,
    metadata: any,
  ): Promise<PaymentInitiateResponse> {
    try {
      this.logger.log(
        `Initiating M-Pesa payment for order ${orderId}, amount: ${amount} ${currency}`,
      );

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate password and timestamp
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Format phone number (remove + and spaces)
      const phoneNumber = this.formatPhoneNumber(metadata?.phoneNumber);

      // STK Push request
      const stkPushRequest = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // M-Pesa requires integer amounts
        PartyA: phoneNumber,
        PartyB: this.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.callbackUrl,
        AccountReference: `ORDER${orderId}`,
        TransactionDesc: metadata?.description || `Payment for Order #${orderId}`,
      };

      const response = await this.httpClient.post(
        '/mpesa/stkpush/v1/processrequest',
        stkPushRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          transactionId: response.data.CheckoutRequestID,
          message: response.data.ResponseDescription || 'STK Push sent successfully',
          metadata: {
            checkoutRequestId: response.data.CheckoutRequestID,
            merchantRequestId: response.data.MerchantRequestID,
            customerMessage: response.data.CustomerMessage,
          },
        };
      }

      throw new Error(response.data.ResponseDescription || 'STK Push failed');
    } catch (error) {
      this.logger.error(
        `Failed to initiate M-Pesa payment: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        transactionId: '',
        message: error.response?.data?.errorMessage || error.message,
      };
    }
  }

  async verifyPayment(
    transactionId: string,
  ): Promise<PaymentVerifyResponse> {
    try {
      this.logger.log(`Verifying M-Pesa payment: ${transactionId}`);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate password and timestamp
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // STK Push Query request
      const queryRequest = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: transactionId,
      };

      const response = await this.httpClient.post(
        '/mpesa/stkpushquery/v1/query',
        queryRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.ResponseCode === '0') {
        const status = this.mapMpesaStatus(response.data.ResultCode);

        return {
          success: true,
          status,
          transactionId: response.data.CheckoutRequestID,
          message: response.data.ResultDesc,
          metadata: response.data,
        };
      }

      throw new Error(
        response.data.ResponseDescription || 'Failed to query payment',
      );
    } catch (error) {
      this.logger.error(
        `Failed to verify M-Pesa payment: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        status: 'failed',
        transactionId,
        message: error.response?.data?.errorMessage || error.message,
      };
    }
  }

  async handleCallback(payload: any): Promise<PaymentCallbackResponse> {
    try {
      this.logger.log('Processing M-Pesa callback');

      const { Body } = payload;
      const { stkCallback } = Body || {};

      if (!stkCallback) {
        throw new Error('Invalid callback payload');
      }

      const {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata,
      } = stkCallback;

      // Extract metadata items
      const metadata: any = {};
      if (CallbackMetadata && CallbackMetadata.Item) {
        CallbackMetadata.Item.forEach((item: any) => {
          metadata[item.Name] = item.Value;
        });
      }

      const status = this.mapMpesaStatus(ResultCode);

      // Extract order ID from AccountReference
      const orderId = this.extractOrderId(metadata.AccountReference);

      return {
        success: ResultCode === 0,
        transactionId: CheckoutRequestID,
        orderId: orderId ?? undefined,
        status,
        amount: metadata.Amount,
        message: ResultDesc,
        metadata: {
          merchantRequestId: MerchantRequestID,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: metadata.TransactionDate,
          phoneNumber: metadata.PhoneNumber,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to process M-Pesa callback: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        transactionId: payload?.Body?.stkCallback?.CheckoutRequestID,
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Get OAuth access token from M-Pesa
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`,
      ).toString('base64');

      const response = await this.httpClient.get(
        '/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      if (response.data.access_token) {
        return response.data.access_token;
      }

      throw new Error('Failed to get access token');
    } catch (error) {
      this.logger.error(`Failed to get M-Pesa access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const str = `${this.businessShortCode}${this.passKey}${timestamp}`;
    return Buffer.from(str).toString('base64');
  }

  /**
   * Generate timestamp in format YYYYMMDDHHmmss
   */
  private generateTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove spaces, dashes, and plus signs
    let cleaned = phoneNumber.replace(/[\s\-+]/g, '');

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }

    // If doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Map M-Pesa result code to our internal status
   */
  private mapMpesaStatus(
    resultCode: number | string,
  ): 'pending' | 'authorized' | 'captured' | 'failed' | 'voided' {
    const code = Number(resultCode);

    if (code === 0) {
      return 'captured'; // Successful payment
    } else if (code === 1032) {
      return 'voided'; // Cancelled by user
    } else if (code === 1037) {
      return 'pending'; // Timeout/no response
    } else {
      return 'failed'; // Any other error
    }
  }

  /**
   * Extract order ID from account reference
   */
  private extractOrderId(reference: string): number | null {
    try {
      // Extract number from format like "ORDER123"
      const match = reference?.match(/ORDER(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    } catch {
      return null;
    }
  }
}
