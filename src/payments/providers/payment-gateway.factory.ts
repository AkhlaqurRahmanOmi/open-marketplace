import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { PesapalProvider } from './pesapal.provider';
import { MpesaProvider } from './mpesa.provider';
import { PaymentGateway } from '../dtos/initiate-payment.dto';

/**
 * Factory to get the appropriate payment gateway provider
 * This makes it easy to add new payment gateways in the future
 */
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly pesapalProvider: PesapalProvider,
    private readonly mpesaProvider: MpesaProvider,
  ) {}

  /**
   * Get the payment gateway provider based on the gateway name
   * @param gateway - The gateway name ('pesapal' or 'mpesa')
   * @returns The payment gateway provider instance
   */
  getGateway(gateway: PaymentGateway | string): IPaymentGateway {
    switch (gateway.toLowerCase()) {
      case PaymentGateway.PESAPAL:
      case 'pesapal':
        return this.pesapalProvider;

      case PaymentGateway.MPESA:
      case 'mpesa':
        return this.mpesaProvider;

      default:
        throw new BadRequestException(
          `Unsupported payment gateway: ${gateway}. Supported gateways are: pesapal, mpesa`,
        );
    }
  }

  /**
   * Get list of all available payment gateways
   */
  getAvailableGateways(): string[] {
    return [PaymentGateway.PESAPAL, PaymentGateway.MPESA];
  }

  /**
   * Check if a gateway is supported
   */
  isGatewaySupported(gateway: string): boolean {
    return this.getAvailableGateways().includes(gateway as PaymentGateway);
  }
}
