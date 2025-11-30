import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dtos/initiate-payment.dto';
import { VerifyPaymentDto } from './dtos/verify-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate a payment transaction
   */
  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment transaction' })
  @ApiResponse({
    status: 200,
    description: 'Payment initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or order already paid',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(dto);
  }

  /**
   * Verify payment status
   */
  @Post('verify')
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  /**
   * Get payment details by transaction ID
   */
  @Get(':transactionId')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async getPayment(@Param('transactionId') transactionId: string) {
    return this.paymentsService.getPayment(transactionId);
  }

  /**
   * Get all payments for an order
   */
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({
    status: 200,
    description: 'Order payments retrieved successfully',
  })
  async getOrderPayments(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getOrderPayments(orderId);
  }

  /**
   * Get available payment gateways
   */
  @Get()
  @ApiOperation({ summary: 'Get available payment gateways' })
  @ApiResponse({
    status: 200,
    description: 'Available payment gateways',
  })
  getAvailableGateways() {
    return this.paymentsService.getAvailableGateways();
  }

  /**
   * Pesapal IPN/Callback endpoint
   */
  @Post('callback/pesapal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pesapal payment callback/IPN' })
  @ApiResponse({
    status: 200,
    description: 'Callback processed successfully',
  })
  async pesapalCallback(@Body() payload: any) {
    return this.paymentsService.handleCallback('pesapal', payload);
  }

  /**
   * M-Pesa callback endpoint
   */
  @Post('callback/mpesa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'M-Pesa payment callback' })
  @ApiResponse({
    status: 200,
    description: 'Callback processed successfully',
  })
  async mpesaCallback(@Body() payload: any) {
    return this.paymentsService.handleCallback('mpesa', payload);
  }
}
