import { PrismaClient } from '@prisma/client';
import { OrderStatus } from '../../types';

const prisma = new PrismaClient();

export interface OrderToolFunctions {
  getOrderDetails: (orderNumber: string) => Promise<OrderDetailsResult>;
  getUserOrders: (userId: string) => Promise<OrderSummary[]>;
  trackOrder: (orderNumber: string) => Promise<TrackingResult>;
  cancelOrder: (orderNumber: string, reason: string) => Promise<CancellationResult>;
  modifyOrder: (orderNumber: string, modifications: OrderModification) => Promise<ModificationResult>;
}

export interface OrderDetailsResult {
  success: boolean;
  data?: {
    orderNumber: string;
    status: OrderStatus;
    total: number;
    currency: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    shippingAddress?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export interface OrderSummary {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: Date;
}

export interface TrackingResult {
  success: boolean;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: OrderStatus;
  estimatedDelivery?: Date;
  error?: string;
}

export interface CancellationResult {
  success: boolean;
  orderNumber: string;
  status: OrderStatus;
  refundAmount?: number;
  message: string;
}

export interface ModificationResult {
  success: boolean;
  orderNumber: string;
  message: string;
  updatedFields?: string[];
}

export interface OrderModification {
  shippingAddress?: Record<string, string>;
  addItems?: Array<{ name: string; quantity: number; price: number }>;
  removeItems?: string[];
}

export const orderTools = {
  getOrderDetails: async (orderNumber: string): Promise<OrderDetailsResult> => {
    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          payments: true,
          refunds: true,
        },
      });

      if (!order) {
        return { success: false, error: `Order ${orderNumber} not found` };
      }

      return {
        success: true,
        data: {
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          currency: order.currency,
          items: order.items as Array<{ name: string; quantity: number; price: number }>,
          shippingAddress: order.shippingAddress as Record<string, string> | undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return { success: false, error: 'Failed to fetch order details' };
    }
  },

  getUserOrders: async (userId: string): Promise<OrderSummary[]> => {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return orders.map((order: any) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        currency: order.currency,
        itemCount: (order.items as Array<unknown>).length,
        createdAt: order.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  },

  trackOrder: async (orderNumber: string): Promise<TrackingResult> => {
    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!order) {
        return { success: false, error: `Order ${orderNumber} not found` };
      }

      if (!order.trackingNumber) {
        return { success: false, error: 'Tracking information not available' };
      }

      return {
        success: true,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl || undefined,
        status: order.status,
      };
    } catch (error) {
      console.error('Error tracking order:', error);
      return { success: false, error: 'Failed to track order' };
    }
  },

  cancelOrder: async (orderNumber: string, _reason: string): Promise<CancellationResult> => {
    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { payments: true },
      });

      if (!order) {
        return { success: false, orderNumber, status: 'PENDING' as OrderStatus, message: `Order ${orderNumber} not found` };
      }

      const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      if (!cancellableStatuses.includes(order.status)) {
        return {
          success: false,
          orderNumber,
          status: order.status,
          message: `Order cannot be cancelled. Current status: ${order.status}`,
        };
      }

      const updatedOrder = await prisma.order.update({
        where: { orderNumber },
        data: { status: OrderStatus.CANCELLED },
      });

      // Calculate refund if payment was made
      const completedPayment = order.payments.find((p: any) => p.status === 'COMPLETED');
      const refundAmount = completedPayment ? Number(completedPayment.amount) : 0;

      return {
        success: true,
        orderNumber,
        status: updatedOrder.status,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        message: refundAmount > 0
          ? `Order cancelled. Refund of $${refundAmount} will be processed within 5-7 business days.`
          : 'Order cancelled successfully.',
      };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, orderNumber, status: 'PENDING' as OrderStatus, message: 'Failed to cancel order' };
    }
  },

  modifyOrder: async (orderNumber: string, modifications: OrderModification): Promise<ModificationResult> => {
    try {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!order) {
        return { success: false, orderNumber, message: `Order ${orderNumber} not found` };
      }

      const updateData: Record<string, unknown> = {};

      if (modifications.shippingAddress) {
        updateData.shippingAddress = modifications.shippingAddress;
      }

      // Note: Adding/removing items would require more complex logic in production
      if (modifications.addItems && modifications.addItems.length > 0) {
        const currentItems = (order.items as Array<{ name: string; quantity: number; price: number }>) || [];
        updateData.items = [...currentItems, ...modifications.addItems];
      }

      if (Object.keys(updateData).length === 0) {
        return { success: false, orderNumber, message: 'No valid modifications provided' };
      }

      await prisma.order.update({
        where: { orderNumber },
        data: updateData,
      });

      return {
        success: true,
        orderNumber,
        message: 'Order modified successfully',
        updatedFields: Object.keys(updateData),
      };
    } catch (error) {
      console.error('Error modifying order:', error);
      return { success: false, orderNumber, message: 'Failed to modify order' };
    }
  },
};
