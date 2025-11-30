/**
 * Common interface that all payment gateway providers must implement
 * This ensures consistency and makes it easy to add new payment gateways
 */

export interface PaymentInitiateResponse {
  success: boolean;
  redirectUrl?: string;
  transactionId: string;
  message?: string;
  metadata?: any;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'voided';
  transactionId: string;
  amount?: number;
  currency?: string;
  message?: string;
  metadata?: any;
}

export interface PaymentCallbackResponse {
  success: boolean;
  transactionId: string;
  orderId?: number;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'voided';
  amount?: number;
  message?: string;
  metadata?: any;
}

export interface IPaymentGateway {
  /**
   * Initialize a payment transaction
   * @param orderId - The order ID from the database
   * @param amount - Amount to charge
   * @param currency - Currency code (e.g., 'KES', 'USD')
   * @param metadata - Additional data (user info, phone number, etc.)
   */
  initiatePayment(
    orderId: number,
    amount: number,
    currency: string,
    metadata: any,
  ): Promise<PaymentInitiateResponse>;

  /**
   * Verify payment status from the gateway
   * @param transactionId - Transaction ID from the gateway
   */
  verifyPayment(transactionId: string): Promise<PaymentVerifyResponse>;

  /**
   * Handle callback/webhook from the gateway
   * @param payload - Raw payload from the gateway
   */
  handleCallback(payload: any): Promise<PaymentCallbackResponse>;

  /**
   * Get the gateway name
   */
  getGatewayName(): string;
}
