import { PrismaClient } from '@prisma/client';
import { PaymentStatus, RefundStatus } from '../../types';

const prisma = new PrismaClient();

export interface BillingToolFunctions {
  getInvoiceDetails: (invoiceId: string) => Promise<InvoiceResult>;
  getPaymentHistory: (userId: string) => Promise<PaymentSummary[]>;
  checkRefundStatus: (refundId: string) => Promise<RefundResult>;
  getSubscriptionInfo: (userId: string) => Promise<SubscriptionResult>;
  processRefund: (orderId: string, amount: number, reason: string) => Promise<RefundProcessingResult>;
}

export interface InvoiceResult {
  success: boolean;
  data?: {
    id: string;
    invoiceUrl?: string;
    amount: number;
    currency: string;
    status: string;
    orderNumber: string;
    paymentMethod: string;
    createdAt: Date;
  };
  error?: string;
}

export interface PaymentSummary {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
}

export interface RefundResult {
  success: boolean;
  data?: {
    id: string;
    orderNumber: string;
    amount: number;
    currency: string;
    status: RefundStatus;
    reason?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export interface SubscriptionResult {
  success: boolean;
  hasSubscription?: boolean;
  plan?: string;
  status?: string;
  nextBillingDate?: Date;
  error?: string;
}

export interface RefundProcessingResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  message: string;
}

export const billingTools = {
  getInvoiceDetails: async (invoiceId: string): Promise<InvoiceResult> => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payment: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!invoice) {
        return { success: false, error: `Invoice ${invoiceId} not found` };
      }

      return {
        success: true,
        data: {
          id: invoice.id,
          invoiceUrl: invoice.invoiceUrl || undefined,
          amount: Number(invoice.amount),
          currency: invoice.currency,
          status: invoice.status,
          orderNumber: invoice.payment.order.orderNumber,
          paymentMethod: invoice.payment.paymentMethod,
          createdAt: invoice.createdAt,
        },
      };
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      return { success: false, error: 'Failed to fetch invoice details' };
    }
  },

  getPaymentHistory: async (userId: string): Promise<PaymentSummary[]> => {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          order: { userId },
        },
        include: {
          order: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return payments.map((payment: any) => ({
        id: payment.id,
        orderNumber: payment.order.orderNumber,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId || undefined,
        createdAt: payment.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  },

  checkRefundStatus: async (refundId: string): Promise<RefundResult> => {
    try {
      const refund = await prisma.refund.findUnique({
        where: { id: refundId },
        include: {
          order: true,
        },
      });

      if (!refund) {
        return { success: false, error: `Refund ${refundId} not found` };
      }

      return {
        success: true,
        data: {
          id: refund.id,
          orderNumber: refund.order.orderNumber,
          amount: Number(refund.amount),
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason || undefined,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
        },
      };
    } catch (error) {
      console.error('Error checking refund status:', error);
      return { success: false, error: 'Failed to check refund status' };
    }
  },

  getSubscriptionInfo: async (userId: string): Promise<SubscriptionResult> => {
    // This would integrate with a subscription service like Stripe
    // For demo purposes, returning mock data
    try {
      // Check if user has any subscription data
      const subscriptionCount = await prisma.payment.count({
        where: {
          order: { userId },
          status: PaymentStatus.COMPLETED,
        },
      });

      const hasSubscription = subscriptionCount > 0;

      return {
        success: true,
        hasSubscription: hasSubscription,
        plan: hasSubscription ? 'Premium' : undefined,
        status: hasSubscription ? 'active' : undefined,
        nextBillingDate: hasSubscription ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      };
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      return { success: false, error: 'Failed to fetch subscription info' };
    }
  },

  processRefund: async (orderId: string, amount: number, reason: string): Promise<RefundProcessingResult> => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true,
          refunds: true,
        },
      });

      if (!order) {
        return { success: false, message: `Order ${orderId} not found` };
      }

      const completedPayment = order.payments.find((p: any) => p.status === 'COMPLETED');
      if (!completedPayment) {
        return { success: false, message: 'No completed payment found for this order' };
      }

      const maxRefundAmount = Number(completedPayment.amount) - 
        order.refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0);

      if (amount > maxRefundAmount) {
        return { 
          success: false, 
          message: `Refund amount exceeds available refund. Maximum refund: $${maxRefundAmount}` 
        };
      }

      const refund = await prisma.refund.create({
        data: {
          orderId,
          amount,
          currency: order.currency,
          status: RefundStatus.PENDING,
          reason,
        },
      });

      // Update order status
      if (amount === maxRefundAmount) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'REFUNDED' as any },
        });
      }

      return {
        success: true,
        refundId: refund.id,
        amount,
        message: `Refund of $${amount} initiated successfully.`,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, message: 'Failed to process refund' };
    }
  },
};
