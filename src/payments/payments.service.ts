import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../core/config/prisma/prisma.service';
import { PaymentGatewayFactory } from './providers/payment-gateway.factory';
import { PaymentRepository } from './repositories/payment.repository';
import { InitiatePaymentDto } from './dtos/initiate-payment.dto';
import { VerifyPaymentDto } from './dtos/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly paymentRepository: PaymentRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Initiate a payment transaction
   */
  async initiatePayment(dto: InitiatePaymentDto) {
    try {
      this.logger.log(
        `Initiating payment for order ${dto.orderId} via ${dto.gateway}`,
      );

      // Verify order exists and is not already paid
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order ${dto.orderId} not found`);
      }

      // Check if order already has a successful payment
      const successfulPayment = await this.paymentRepository.findSuccessfulPaymentByOrderId(
        dto.orderId,
      );

      if (successfulPayment) {
        throw new BadRequestException(
          'Order already has a successful payment',
        );
      }

      // Get the appropriate payment gateway
      const gateway = this.paymentGatewayFactory.getGateway(dto.gateway);

      // Initiate payment with the gateway
      const gatewayResponse = await gateway.initiatePayment(
        dto.orderId,
        dto.amount,
        dto.currency,
        dto.metadata,
      );

      if (!gatewayResponse.success) {
        throw new BadRequestException(
          gatewayResponse.message || 'Failed to initiate payment',
        );
      }

      // Create payment record in database
      const payment = await this.paymentRepository.createPayment({
        orderId: dto.orderId,
        amount: dto.amount,
        gateway: dto.gateway,
        provider: gateway.getGatewayName(),
        transactionId: gatewayResponse.transactionId,
        status: PaymentStatus.pending,
      });

      // Log the initiation
      await this.paymentRepository.createTransactionLog({
        paymentId: payment.id,
        eventType: 'payment_initiated',
        amount: dto.amount,
        status: 'pending',
        payload: gatewayResponse.metadata,
      });

      return {
        success: true,
        payment: {
          id: payment.id,
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          gateway: payment.gateway,
        },
        redirectUrl: gatewayResponse.redirectUrl,
        message: gatewayResponse.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    try {
      this.logger.log(`Verifying payment: ${dto.transactionId}`);

      // Find payment in database
      const payment =
        await this.paymentRepository.findByTransactionId(dto.transactionId);

      if (!payment) {
        throw new NotFoundException(
          `Payment with transaction ID ${dto.transactionId} not found`,
        );
      }

      // Get the appropriate payment gateway
      const gateway = this.paymentGatewayFactory.getGateway(payment.gateway);

      // Verify with the gateway
      const verifyResponse = await gateway.verifyPayment(dto.transactionId);

      // Update payment status if changed
      if (verifyResponse.status !== payment.status) {
        await this.paymentRepository.updatePaymentStatus(dto.transactionId, {
          status: verifyResponse.status as PaymentStatus,
          metadata: verifyResponse.metadata,
        });

        // If payment is captured, update order status
        if (verifyResponse.status === 'captured') {
          await this.updateOrderStatus(payment.orderId, OrderStatus.processing);
        }
      }

      return {
        success: verifyResponse.success,
        payment: {
          id: payment.id,
          transactionId: payment.transactionId,
          status: verifyResponse.status,
          amount: payment.amount,
          gateway: payment.gateway,
        },
        message: verifyResponse.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle payment callback from gateway
   */
  async handleCallback(gateway: string, payload: any) {
    try {
      this.logger.log(`Handling ${gateway} callback`);

      // Get the appropriate payment gateway
      const paymentGateway = this.paymentGatewayFactory.getGateway(gateway);

      // Process callback
      const callbackResponse = await paymentGateway.handleCallback(payload);

      if (!callbackResponse.transactionId) {
        throw new BadRequestException('Invalid callback: missing transaction ID');
      }

      // Find payment in database
      const payment = await this.paymentRepository.findByTransactionId(
        callbackResponse.transactionId,
      );

      if (!payment) {
        this.logger.warn(
          `Payment not found for transaction: ${callbackResponse.transactionId}`,
        );
        return {
          success: false,
          message: 'Payment not found',
        };
      }

      // Log the callback
      await this.paymentRepository.createTransactionLog({
        paymentId: payment.id,
        eventType: 'callback_received',
        amount: callbackResponse.amount,
        status: callbackResponse.status,
        payload: payload,
      });

      // Update payment status
      await this.paymentRepository.updatePaymentStatus(
        callbackResponse.transactionId,
        {
          status: callbackResponse.status as PaymentStatus,
          metadata: callbackResponse.metadata,
        },
      );

      // If payment is successful, update order status
      if (callbackResponse.status === 'captured') {
        await this.updateOrderStatus(payment.orderId, OrderStatus.processing);
      } else if (callbackResponse.status === 'failed') {
        // Optionally handle failed payments
        this.logger.warn(`Payment failed for order ${payment.orderId}`);
      }

      return {
        success: true,
        message: 'Callback processed successfully',
        payment: {
          id: payment.id,
          transactionId: payment.transactionId,
          status: callbackResponse.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle callback: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(transactionId: string) {
    const payment =
      await this.paymentRepository.findByTransactionId(transactionId);

    if (!payment) {
      throw new NotFoundException(
        `Payment with transaction ID ${transactionId} not found`,
      );
    }

    return {
      id: payment.id,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      status: payment.status,
      gateway: payment.gateway,
      provider: payment.provider,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      transactionLogs: (payment as any).transactionLogs || [],
    };
  }

  /**
   * Get all payments for an order
   */
  async getOrderPayments(orderId: number) {
    const payments = await this.paymentRepository.findByOrderId(orderId);
    const stats = await this.paymentRepository.getOrderPaymentStats(orderId);

    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        status: payment.status,
        gateway: payment.gateway,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })),
      stats,
    };
  }

  /**
   * Get available payment gateways
   */
  getAvailableGateways() {
    return {
      gateways: this.paymentGatewayFactory.getAvailableGateways(),
    };
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(orderId: number, status: OrderStatus) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          currentStatus: status,
          updatedAt: new Date(),
        },
      });

      // Create order status history
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: status.toString(),
          note: `Order status updated after payment`,
        },
      });

      this.logger.log(`Order ${orderId} status updated to ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${error.message}`,
        error.stack,
      );
      // Don't throw - payment was successful, order update is secondary
    }
  }
}
