import type { AgentResponse, ConversationContext } from '../types';
import { AgentType } from '../types';
import { orderTools, type OrderToolFunctions } from './tools/order-tools';

export interface OrderAgent {
  handle: (message: string, context: ConversationContext) => Promise<AgentResponse>;
  getSystemPrompt: (userContext?: Record<string, unknown>) => string;
}

export class OrderAgentImpl implements OrderAgent {
  private tools: OrderToolFunctions;

  constructor(tools: OrderToolFunctions = orderTools) {
    this.tools = tools;
  }

  async handle(message: string, context: ConversationContext): Promise<AgentResponse> {
    const messageLower = message.toLowerCase();
    const contextData = context.metadata || {};

    // Check for order number in message
    const orderNumberMatch = message.match(/ORD-\d{3}/i);
    const orderNumber = orderNumberMatch ? orderNumberMatch[0] : (contextData.lastOrderNumber as string | undefined);

    // Determine what action to take based on message content
    if (this.isTrackingRequest(messageLower)) {
      if (!orderNumber) {
        return {
          content: "I'd be happy to help you track your order. Could you please provide your order number (e.g., ORD-001)?",
          agentType: AgentType.ORDER,
          reasoning: 'Requesting order number for tracking',
        };
      }

      const tracking = await this.tools.trackOrder(orderNumber);
      if (tracking.success && tracking.trackingNumber) {
        return {
          content: `Your order ${orderNumber} is ${tracking.status}. Tracking number: ${tracking.trackingNumber}. Track it here: ${tracking.trackingUrl}`,
          agentType: AgentType.ORDER,
          reasoning: 'Provided tracking information',
        };
      } else {
        return {
          content: tracking.error || 'Unable to retrieve tracking information.',
          agentType: AgentType.ORDER,
          reasoning: 'Tracking information not available',
        };
      }
    }

    if (this.isStatusRequest(messageLower)) {
      if (!orderNumber) {
        return {
          content: "I can check your order status. Please provide your order number (e.g., ORD-001).",
          agentType: AgentType.ORDER,
          reasoning: 'Requesting order number for status check',
        };
      }

      const orderDetails = await this.tools.getOrderDetails(orderNumber);
      if (orderDetails.success && orderDetails.data) {
        return {
          content: `Order ${orderNumber} Status: ${orderDetails.data.status}\n\n` +
            `Items: ${orderDetails.data.items.map((i: { name: string; quantity: number; price: number }) => 
              `${i.name} (x${i.quantity}) - $${i.price}`).join(', ')}\n` +
            `Total: $${orderDetails.data.total} ${orderDetails.data.currency}\n` +
            `Placed on: ${new Date(orderDetails.data.createdAt).toLocaleDateString()}`,
          agentType: AgentType.ORDER,
          reasoning: 'Provided order details',
        };
      } else {
        return {
          content: orderDetails.error || 'Unable to retrieve order details.',
          agentType: AgentType.ORDER,
          reasoning: 'Order details not found',
        };
      }
    }

    if (this.isCancellationRequest(messageLower)) {
      if (!orderNumber) {
        return {
          content: "I can help you cancel your order. Please provide your order number.",
          agentType: AgentType.ORDER,
          reasoning: 'Requesting order number for cancellation',
        };
      }

      const reason = this.extractCancellationReason(message);
      const cancellation = await this.tools.cancelOrder(orderNumber, reason);
      
      return {
        content: cancellation.message,
        agentType: AgentType.ORDER,
        reasoning: `Order ${cancellation.success ? 'cancelled' : 'cancellation failed'}`,
      };
    }

    if (this.isModificationRequest(messageLower)) {
      if (!orderNumber) {
        return {
          content: "I can help you modify your order. Please provide your order number first.",
          agentType: AgentType.ORDER,
          reasoning: 'Requesting order number for modification',
        };
      }

      const modifications = this.parseModifications(message);
      if (Object.keys(modifications).length === 0) {
        return {
          content: "What would you like to modify about your order? You can change the shipping address or add/remove items.",
          agentType: AgentType.ORDER,
          reasoning: 'Requesting modification details',
        };
      }

      const result = await this.tools.modifyOrder(orderNumber, modifications);
      return {
        content: result.message,
        agentType: AgentType.ORDER,
        reasoning: `Modification ${result.success ? 'completed' : 'failed'}`,
      };
    }

    // Default response with user's orders
    const orders = await this.tools.getUserOrders(context.userId);
    
    if (orders.length === 0) {
      return {
        content: "I don't see any orders associated with your account. Have you placed an order recently?",
        agentType: AgentType.ORDER,
        reasoning: 'No orders found for user',
      };
    }

    const orderList = orders.map((o) => 
      `• ${o.orderNumber} - ${o.status} - $${o.total} (${new Date(o.createdAt).toLocaleDateString()})`
    ).join('\n');

    return {
      content: `Here are your recent orders:\n\n${orderList}\n\nWhich order would you like help with?`,
      agentType: AgentType.ORDER,
      reasoning: 'Listed user orders',
    };
  }

  getSystemPrompt(userContext?: Record<string, unknown>): string {
    return `You are an Order Agent for a customer support system. You specialize in handling order-related inquiries.

Your Responsibilities:
- Check order status and provide detailed information
- Track orders and provide tracking numbers
- Handle order cancellations (only for orders not yet shipped)
- Assist with order modifications (shipping address changes, etc.)
- Provide estimated delivery dates when available

Available Tools:
- getOrderDetails(orderNumber) - Get full order details
- getUserOrders(userId) - List user's orders
- trackOrder(orderNumber) - Get tracking information
- cancelOrder(orderNumber, reason) - Cancel an order
- modifyOrder(orderNumber, modifications) - Modify an order

Guidelines:
- Always verify the order belongs to the user before providing details
- Be clear about what information you can and cannot provide
- For cancellations, explain refund policies
- For tracking, provide the tracking URL if available
- Be empathetic and helpful in your responses

${userContext ? `\nUser Context:\n${JSON.stringify(userContext, null, 2)}` : ''}`;
  }

  private isTrackingRequest(message: string): boolean {
    return /track|tracking|where.*is.*my|delivery status|shipped/i.test(message);
  }

  private isStatusRequest(message: string): boolean {
    return /status|order.*detail|what.*order|check.*order/i.test(message);
  }

  private isCancellationRequest(message: string): boolean {
    return /cancel|stop.*order|don't.*want|changed.*mind/i.test(message);
  }

  private isModificationRequest(message: string): boolean {
    return /change.*address|modify.*order|update.*order|add.*item|remove.*item/i.test(message);
  }

  private extractCancellationReason(message: string): string {
    const reasons = [
      { pattern: /changed.*mind/i, reason: 'Customer changed their mind' },
      { pattern: /found.*better.*price/i, reason: 'Found better price elsewhere' },
      { pattern: /no.*longer.*need/i, reason: 'No longer need the item' },
      { pattern: /wrong.*item/i, reason: 'Ordered wrong item' },
    ];

    for (const { pattern, reason } of reasons) {
      if (pattern.test(message)) {
        return reason;
      }
    }

    return 'Customer requested cancellation';
  }

  private parseModifications(message: string): Record<string, unknown> {
    const modifications: Record<string, unknown> = {};

    // Check for address changes
    if (/change.*address|update.*address|new.*address/i.test(message)) {
      // This would need more sophisticated parsing in production
      modifications.shippingAddress = {
        note: 'Address change requested - user needs to provide new address',
      };
    }

    return modifications;
  }
}

export const orderAgent = new OrderAgentImpl();
