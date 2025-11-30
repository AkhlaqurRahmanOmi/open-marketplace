import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PesapalProvider } from './providers/pesapal.provider';
import { MpesaProvider } from './providers/mpesa.provider';
import { PaymentGatewayFactory } from './providers/payment-gateway.factory';

/**
 * Payments Module
 * Handles payment gateway integrations (Pesapal, M-Pesa)
 * Provides payment initiation, verification, and callback handling
 */
@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentRepository,
    PesapalProvider,
    MpesaProvider,
    PaymentGatewayFactory,
  ],
  exports: [PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
