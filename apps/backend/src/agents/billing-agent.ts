import type { AgentResponse, ConversationContext } from '../types';
import { AgentType } from '../types';
import { billingTools, type BillingToolFunctions } from './tools/billing';

export interface BillingAgent {
  handle: (message: string, context: ConversationContext) => Promise<AgentResponse>;
  getSystemPrompt: (userContext?: Record<string, unknown>) => string;
}

export class BillingAgentImpl implements BillingAgent {
  private tools: BillingToolFunctions;

  constructor(tools: BillingToolFunctions = billingTools) {
    this.tools = tools;
  }

  async handle(message: string, context: ConversationContext): Promise<AgentResponse> {
    const messageLower = message.toLowerCase();

    // Check for refund-related queries
    if (this.isRefundRequest(messageLower)) {
      const refundIdMatch = message.match(/REF-\d+/i);
      const refundId = refundIdMatch ? refundIdMatch[0] : undefined;

      if (refundId) {
        const refundStatus = await this.tools.checkRefundStatus(refundId);
        if (refundStatus.success && refundStatus.data) {
          return {
            content: `Refund ${refundId}:\n` +
              `Amount: $${refundStatus.data.amount} ${refundStatus.data.currency}\n` +
              `Status: ${refundStatus.data.status}\n` +
              `Reason: ${refundStatus.data.reason || 'Not specified'}\n` +
              `Requested: ${new Date(refundStatus.data.createdAt).toLocaleDateString()}`,
            agentType: AgentType.BILLING,
            reasoning: 'Provided refund status',
          };
        }
      }

      // Get payment history to show refund info
      const payments = await this.tools.getPaymentHistory(context.userId);
      const refundedPayments = payments.filter((p) => p.status === 'REFUNDED');

      if (refundedPayments.length === 0) {
        return {
          content: "I don't see any refunds associated with your account. Would you like to request a refund for an order?",
          agentType: AgentType.BILLING,
          reasoning: 'No refunds found',
        };
      }

      const refundList = refundedPayments.map((p) =>
        `• Order ${p.orderNumber} - Refunded $${p.amount}`
      ).join('\n');

      return {
        content: `Here are your refunded payments:\n\n${refundList}`,
        agentType: AgentType.BILLING,
        reasoning: 'Listed refunded payments',
      };
    }

    // Check for invoice requests
    if (this.isInvoiceRequest(messageLower)) {
      const invoiceIdMatch = message.match(/INV-\d+/i);
      const invoiceId = invoiceIdMatch ? invoiceIdMatch[0] : undefined;

      if (invoiceId) {
        // Search by invoice ID
        const invoice = await this.tools.getInvoiceDetails(invoiceId);
        if (invoice.success && invoice.data) {
          return {
            content: `Invoice ${invoice.data.id}:\n` +
              `Order: ${invoice.data.orderNumber}\n` +
              `Amount: $${invoice.data.amount} ${invoice.data.currency}\n` +
              `Status: ${invoice.data.status}\n` +
              `Payment Method: ${invoice.data.paymentMethod}\n` +
              `Date: ${new Date(invoice.data.createdAt).toLocaleDateString()}\n` +
              (invoice.data.invoiceUrl ? `\nDownload: ${invoice.data.invoiceUrl}` : ''),
            agentType: AgentType.BILLING,
            reasoning: 'Provided invoice details',
          };
        }
      }

      // Show recent invoices
      const payments = await this.tools.getPaymentHistory(context.userId);
      const invoiceList = payments.slice(0, 5).map((p) =>
        `• ${p.orderNumber} - $${p.amount} ${p.currency} - ${p.status} (${new Date(p.createdAt).toLocaleDateString()})`
      ).join('\n');

      return {
        content: `Your recent payment history:\n\n${invoiceList}\n\nWould you like more details on any specific payment?`,
        agentType: AgentType.BILLING,
        reasoning: 'Listed payment history',
      };
    }

    // Check for payment issues
    if (this.isPaymentIssue(messageLower)) {
      return {
        content: "I'm sorry to hear you're experiencing a payment issue. Here are some common solutions:\n\n" +
          "1. **Card Declined**: Try a different payment method or contact your bank\n" +
          "2. **Pending Charges**: Some banks show temporary holds - these usually clear in 1-3 business days\n" +
          "3. **Incorrect Information**: Double-check your billing address matches your card\n\n" +
          "If the issue persists, please provide more details about the error you're seeing.",
        agentType: AgentType.BILLING,
        reasoning: 'Provided payment issue solutions',
      };
    }

    // Check for subscription queries
    if (this.isSubscriptionQuery(messageLower)) {
      const subscription = await this.tools.getSubscriptionInfo(context.userId);

      if (subscription.success) {
        if (subscription.hasSubscription) {
          return {
            content: `Your Subscription:\n` +
              `Plan: ${subscription.plan}\n` +
              `Status: ${subscription.status}\n` +
              `Next Billing Date: ${subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}`,
            agentType: AgentType.BILLING,
            reasoning: 'Provided subscription info',
          };
        }
        return {
          content: "I don't see an active subscription on your account. Would you like to learn about our subscription plans?",
          agentType: AgentType.BILLING,
          reasoning: 'No subscription found',
        };
      }

      return {
        content: "I couldn't retrieve your subscription information. Please try again later.",
        agentType: AgentType.BILLING,
        reasoning: 'Failed to retrieve subscription',
      };
    }

    // Default: Show payment history
    const payments = await this.tools.getPaymentHistory(context.userId);

    if (payments.length === 0) {
      return {
        content: "I don't see any payment history for your account. Have you made any purchases?",
        agentType: AgentType.BILLING,
        reasoning: 'No payment history found',
      };
    }

    const paymentList = payments.slice(0, 10).map((p) =>
      `• ${p.orderNumber} - $${p.amount} ${p.currency} - ${p.status} (${new Date(p.createdAt).toLocaleDateString()})`
    ).join('\n');

    return {
      content: `Your payment history:\n\n${paymentList}\n\nHow can I help you with billing?`,
      agentType: AgentType.BILLING,
      reasoning: 'Listed payment history',
    };
  }

  getSystemPrompt(userContext?: Record<string, unknown>): string {
    return `You are a Billing Agent for a customer support system. You specialize in handling payment, refund, and invoice inquiries.

Your Responsibilities:
- Check payment status and provide payment history
- Process and track refunds
- Provide invoice details and download links
- Handle subscription inquiries
- Troubleshoot payment issues
- Explain billing policies

Available Tools:
- getInvoiceDetails(invoiceId) - Get invoice information
- getPaymentHistory(userId) - List user's payment history
- checkRefundStatus(refundId) - Check refund status
- getSubscriptionInfo(userId) - Get subscription details
- processRefund(orderId, amount, reason) - Initiate a refund

Guidelines:
- Be careful with sensitive financial information
- Never share full card numbers - show only last 4 digits
- Explain refund timelines (5-7 business days for processing)
- Be helpful with payment troubleshooting
- Always confirm before processing refunds

${userContext ? `\nUser Context:\n${JSON.stringify(userContext, null, 2)}` : ''}`;
  }

  private isRefundRequest(message: string): boolean {
    return /refund|money back|get.*money|when.*refund|refund.*status/i.test(message);
  }

  private isInvoiceRequest(message: string): boolean {
    return /invoice|bill.*me|receipt|statement|download.*invoice/i.test(message);
  }

  private isPaymentIssue(message: string): boolean {
    return /payment.*fail|card.*declined|charge.*issue|won't.*charge|payment.*problem/i.test(message);
  }

  private isSubscriptionQuery(message: string): boolean {
    return /subscription|monthly|annual.*plan|cancel.*subscription|change.*plan|upgrade.*plan/i.test(message);
  }
}

export const billingAgent = new BillingAgentImpl();
