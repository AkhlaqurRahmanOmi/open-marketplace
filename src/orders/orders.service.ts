import { Injectable, NotFoundException } from '@nestjs/common';
import {  OrderStatus } from '@prisma/client';
import { OrderManagementProvider } from './providers/order-management.provider';
import { OrderReportsProvider } from './providers/order-reports.provider';
import {
    CreateOrderDto,
    UpdateOrderStatusDto,
    CancelOrderDto,
    OrderFilterDto,
} from './dtos';

@Injectable()
export class OrdersService {
    constructor(
        private readonly orderManagement: OrderManagementProvider,
        private readonly orderReports: OrderReportsProvider,
    ) {}

    // ---------- Read APIs ----------

    getOrders(filterDto: OrderFilterDto) {
        return this.orderManagement.getAllOrders(filterDto);
    }

    getOrderById(id: number) {
        return this.orderManagement.getOrderById(id);
    }

    getUserOrders(userId: number) {
        return this.orderManagement.getUserOrders(userId);
    }

    getOrdersByStatus(status: OrderStatus) {
        return this.orderManagement.getOrdersByStatus(status);
    }

    // ---------- Write APIs ----------

    createOrder(dto: CreateOrderDto) {
        return this.orderManagement.createOrder(dto);
    }

    updateOrderStatus(id: number, dto: UpdateOrderStatusDto) {
        return this.orderManagement.updateOrderStatus(id, dto);
    }

    async cancelOrder(id: number, dto: CancelOrderDto) {
        const existing = await this.orderManagement.getOrderById(id);
        if (!existing) throw new NotFoundException(`Order ${id} not found`);
        return this.orderManagement.cancelOrder(id, dto);
    }

    // ---------- Report APIs ----------

    getSalesOverview(startDate: Date, endDate: Date) {
        return this.orderReports.getSalesOverview(startDate, endDate);
    }

    getTopCustomers(startDate: Date, endDate: Date, limit?: number) {
        return this.orderReports.getTopCustomers(startDate, endDate, limit);
    }

    getOrderStatusReport(startDate: Date, endDate: Date) {
        return this.orderReports.getOrderStatusReport(startDate, endDate);
    }

    getBestSellingProducts(startDate: Date, endDate: Date, limit?: number) {
        return this.orderReports.getBestSellingProducts(startDate, endDate, limit);
    }

    getRevenueByCategory(startDate: Date, endDate: Date) {
        return this.orderReports.getRevenueByCategory(startDate, endDate);
    }

    getAOVTrends(startDate: Date, endDate: Date) {
        return this.orderReports.getAOVTrends(startDate, endDate);
    }
}
