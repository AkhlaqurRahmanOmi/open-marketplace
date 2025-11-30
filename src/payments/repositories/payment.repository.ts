import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, Payment, TransactionLog } from '@prisma/client';
import { PrismaService } from '../../core/config/prisma/prisma.service';

export interface CreatePaymentDto {
  orderId: number;
  amount: number;
  gateway: string;
  provider?: string;
  transactionId: string;
  status?: PaymentStatus;
}

export interface UpdatePaymentStatusDto {
  status: PaymentStatus;
  metadata?: any;
}

export interface CreateTransactionLogDto {
  paymentId: number;
  eventType: string;
  amount?: number;
  status: string;
  payload?: any;
}

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment record
   */
  async createPayment(data: CreatePaymentDto): Promise<Payment> {
    try {
      this.logger.log(`Creating payment for order ${data.orderId}`);

      const payment = await this.prisma.payment.create({
        data: {
          orderId: data.orderId,
          amount: data.amount,
          status: data.status || PaymentStatus.pending,
          gateway: data.gateway,
          provider: data.provider,
          transactionId: data.transactionId,
        },
        include: {
          order: true,
        },
      });

      // Log the payment creation
      await this.createTransactionLog({
        paymentId: payment.id,
        eventType: 'payment_initiated',
        amount: payment.amount,
        status: payment.status,
        payload: JSON.stringify({ gateway: data.gateway }),
      });

      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find payment by ID
   */
  async findById(id: number): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        transactionLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find payment by transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { transactionId },
      include: {
        order: true,
        transactionLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find payments by order ID
   */
  async findByOrderId(orderId: number): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { orderId },
      include: {
        transactionLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    transactionId: string,
    data: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    try {
      this.logger.log(`Updating payment ${transactionId} to status: ${data.status}`);

      const payment = await this.prisma.payment.update({
        where: { transactionId },
        data: {
          status: data.status,
          updatedAt: new Date(),
        },
        include: {
          order: true,
        },
      });

      // Log the status update
      await this.createTransactionLog({
        paymentId: payment.id,
        eventType: 'status_update',
        amount: payment.amount,
        status: data.status,
        payload: data.metadata ? JSON.stringify(data.metadata) : null,
      });

      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to update payment status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a transaction log entry
   */
  async createTransactionLog(
    data: CreateTransactionLogDto,
  ): Promise<TransactionLog> {
    try {
      return await this.prisma.transactionLog.create({
        data: {
          paymentId: data.paymentId,
          eventType: data.eventType,
          amount: data.amount,
          status: data.status,
          payload: data.payload ? JSON.stringify(data.payload) : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create transaction log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction logs for a payment
   */
  async getTransactionLogs(paymentId: number): Promise<TransactionLog[]> {
    return this.prisma.transactionLog.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find successful payment for an order
   */
  async findSuccessfulPaymentByOrderId(orderId: number): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        orderId,
        status: PaymentStatus.captured,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if order has pending payment
   */
  async hasPendingPayment(orderId: number): Promise<boolean> {
    const count = await this.prisma.payment.count({
      where: {
        orderId,
        status: PaymentStatus.pending,
      },
    });

    return count > 0;
  }

  /**
   * Get payment statistics for an order
   */
  async getOrderPaymentStats(orderId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
    });

    return {
      total: payments.length,
      pending: payments.filter((p) => p.status === PaymentStatus.pending).length,
      captured: payments.filter((p) => p.status === PaymentStatus.captured).length,
      failed: payments.filter((p) => p.status === PaymentStatus.failed).length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      capturedAmount: payments
        .filter((p) => p.status === PaymentStatus.captured)
        .reduce((sum, p) => sum + p.amount, 0),
    };
  }

  /**
   * Delete payment (soft delete by updating status to voided)
   */
  async voidPayment(transactionId: string): Promise<Payment> {
    try {
      this.logger.log(`Voiding payment: ${transactionId}`);

      const payment = await this.prisma.payment.update({
        where: { transactionId },
        data: {
          status: PaymentStatus.voided,
          updatedAt: new Date(),
        },
      });

      // Log the void action
      await this.createTransactionLog({
        paymentId: payment.id,
        eventType: 'payment_voided',
        amount: payment.amount,
        status: PaymentStatus.voided,
      });

      return payment;
    } catch (error) {
      this.logger.error(`Failed to void payment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
