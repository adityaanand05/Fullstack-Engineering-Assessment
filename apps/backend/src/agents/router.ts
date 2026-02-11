import type { RouteDecision, ConversationContext } from '../types';
import { AgentType } from '../types';

export interface RouterAgent {
  route: (message: string, context?: ConversationContext) => Promise<RouteDecision>;
  getSystemPrompt: () => string;
}

// Keyword-based router for intent classification
export class RouterAgentImpl implements RouterAgent {
  private orderKeywords = [
    'order', 'tracking', 'shipped', 'delivery', 'cancel', 'modify',
    'order number', 'ord-', 'where is my', 'when will', 'arrival',
    'shipping', 'delivery status', 'track my'
  ];

  private billingKeywords = [
    'payment', 'refund', 'invoice', 'charge', 'bill', 'money',
    'subscription', 'credit card', 'pay', 'transaction', 'price',
    'invoice', 'receipt', 'cost', 'fee'
  ];

  private supportKeywords = [
    'help', 'question', 'problem', 'issue', 'faq', 'how to',
    'support', 'account', 'login', 'password', 'reset',
    'return', 'exchange', 'warranty', 'product'
  ];

  async route(message: string, context?: ConversationContext): Promise<RouteDecision> {
    const messageLower = message.toLowerCase();

    // Check if there's an existing context with a specific agent type
    if (context?.agentType && context.agentType !== AgentType.ROUTER) {
      // Continue with the same agent type if it makes sense
      if (this.isRelatedToAgent(message, context.agentType)) {
        return {
          agentType: context.agentType,
          confidence: 0.9,
          reasoning: 'Continuing with same agent based on conversation context',
        };
      }
    }

    // Calculate scores for each agent type
    const orderScore = this.calculateScore(messageLower, this.orderKeywords);
    const billingScore = this.calculateScore(messageLower, this.billingKeywords);
    const supportScore = this.calculateScore(messageLower, this.supportKeywords);

    // Determine the best match
    const scores = [
      { type: AgentType.ORDER, score: orderScore },
      { type: AgentType.BILLING, score: billingScore },
      { type: AgentType.SUPPORT, score: supportScore },
    ];

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // If the best score is very low, use support as fallback
    if (best.score < 0.2) {
      return {
        agentType: AgentType.SUPPORT,
        confidence: 0.5,
        reasoning: 'Low confidence - using support agent as fallback',
      };
    }

    return {
      agentType: best.type,
      confidence: Math.min(best.score, 0.95),
      reasoning: `Matched ${best.type} keywords in message`,
    };
  }

  private calculateScore(message: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        score += 0.2;
        // Bonus for exact word match
        const wordPattern = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordPattern.test(message)) {
          score += 0.1;
        }
      }
    }
    return Math.min(score, 1);
  }

  private isRelatedToAgent(message: string, agentType: AgentType): boolean {
    const messageLower = message.toLowerCase();
    
    switch (agentType) {
      case AgentType.ORDER:
        return this.calculateScore(messageLower, this.orderKeywords) > 0.1;
      case AgentType.BILLING:
        return this.calculateScore(messageLower, this.billingKeywords) > 0.1;
      case AgentType.SUPPORT:
        return this.calculateScore(messageLower, this.supportKeywords) > 0.1;
      default:
        return false;
    }
  }

  getSystemPrompt(): string {
    return `You are the Router Agent for a customer support system. Your role is to analyze incoming customer queries and delegate them to the appropriate specialized sub-agent.

Available Sub-Agents:
1. **Order Agent** - Handles order status, tracking, modifications, cancellations, and delivery inquiries.
2. **Billing Agent** - Handles payment issues, refunds, invoices, subscriptions, and billing inquiries.
3. **Support Agent** - Handles general support, FAQs, troubleshooting, and account inquiries.

Routing Guidelines:
- Analyze the customer's query to determine the intent
- Classify the query and route to the appropriate agent
- Handle fallback for unclassified queries (default to Support Agent)
- Consider conversation context when routing

Response Format:
Provide a routing decision with your reasoning. The system will handle the actual delegation.`;
  }
}

export const routerAgent = new RouterAgentImpl();
