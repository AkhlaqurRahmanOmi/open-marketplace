import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Roles } from '../auth/decorator/roles.decorator';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  OrderFilterDto,
} from './dtos';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheTTL } from '../shared/decorators/cache-ttl.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ============ Customer Endpoints ============

  @Post()
  @Permissions('orders:create')
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orders.createOrder(createOrderDto);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @Permissions('orders:view')
  @HttpCode(HttpStatus.OK)
  getOrders(@Query() filterDto: OrderFilterDto) {
    return this.orders.getOrders(filterDto);
  }

  @Get(':id')
  @Permissions('orders:view')
  @HttpCode(HttpStatus.OK)
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orders.getOrderById(id);
  }

  @Patch(':id/cancel')
  @Permissions('orders:cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelOrderDto,
  ) {
    return this.orders.cancelOrder(id, cancelDto);
  }
}
