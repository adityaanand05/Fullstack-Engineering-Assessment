import type { AgentResponse, ConversationContext } from '../types';
import { AgentType } from '../types';
import { routerAgent, type RouterAgent } from './router';
import { llmRouter, type LLMRouterAgent } from './router-llm';
import { orderAgent, type OrderAgent } from './order-agent';
import { billingAgent, type BillingAgent } from './billing-agent';
import { supportAgent, type SupportAgent } from './support-agent';

export interface MultiAgentSystem {
  processMessage: (message: string, context: ConversationContext) => Promise<AgentResponse>;
  getAgentCapabilities: (agentType: AgentType) => { name: string; description: string; tools: string[] };
  listAgents: () => Array<{ type: AgentType; name: string; description: string }>;
}

export class AgentCoordinator implements MultiAgentSystem {
  private router: RouterAgent | LLMRouterAgent;
  private orderAgent: OrderAgent;
  private billingAgent: BillingAgent;
  private supportAgent: SupportAgent;
  private useLLMRouter: boolean;

  constructor(useLLMRouter = true) {
    this.useLLMRouter = useLLMRouter;
    this.router = useLLMRouter ? llmRouter : routerAgent;
    this.orderAgent = orderAgent;
    this.billingAgent = billingAgent;
    this.supportAgent = supportAgent;
  }

  async processMessage(message: string, context: ConversationContext): Promise<AgentResponse> {
    // Step 1: Route the message to the appropriate agent
    const routingDecision = await this.router.route(message, context);

    // Update context with the routed agent type
    const updatedContext: ConversationContext = {
      ...context,
      agentType: routingDecision.agentType,
    };

    // Step 2: Process with the appropriate sub-agent
    let response: AgentResponse;

    switch (routingDecision.agentType) {
      case AgentType.ORDER:
        response = await this.orderAgent.handle(message, updatedContext);
        break;
      case AgentType.BILLING:
        response = await this.billingAgent.handle(message, updatedContext);
        break;
      case AgentType.SUPPORT:
        response = await this.supportAgent.handle(message, updatedContext);
        break;
      default:
        // Fallback to support agent
        response = await this.supportAgent.handle(message, updatedContext);
    }

    // Add reasoning if available
    response.reasoning = routingDecision.reasoning;

    return response;
  }

  getAgentCapabilities(agentType: AgentType): { name: string; description: string; tools: string[] } {
    switch (agentType) {
      case AgentType.ROUTER:
        return {
          name: 'Router Agent',
          description: 'Analyzes and routes queries to specialized agents',
          tools: ['intentClassification'],
        };
      case AgentType.ORDER:
        return {
          name: 'Order Agent',
          description: 'Handles order status, tracking, modifications, and cancellations',
          tools: ['getOrderDetails', 'getUserOrders', 'trackOrder', 'cancelOrder', 'modifyOrder'],
        };
      case AgentType.BILLING:
        return {
          name: 'Billing Agent',
          description: 'Handles payments, refunds, invoices, and subscriptions',
          tools: ['getInvoiceDetails', 'getPaymentHistory', 'checkRefundStatus', 'getSubscriptionInfo', 'processRefund'],
        };
      case AgentType.SUPPORT:
        return {
          name: 'Support Agent',
          description: 'Handles general inquiries, FAQs, and troubleshooting',
          tools: ['queryConversationHistory', 'searchFAQs', 'getUserInfo', 'getRecentInteractions'],
        };
      default:
        return {
          name: 'Unknown',
          description: 'Unknown agent type',
          tools: [],
        };
    }
  }

  listAgents(): Array<{ type: AgentType; name: string; description: string }> {
    return [
      {
        type: AgentType.ROUTER,
        name: 'Router Agent',
        description: 'Analyzes incoming queries and delegates to appropriate sub-agents',
      },
      {
        type: AgentType.ORDER,
        name: 'Order Agent',
        description: 'Handles order status, tracking, modifications, and cancellations',
      },
      {
        type: AgentType.BILLING,
        name: 'Billing Agent',
        description: 'Handles payments, refunds, invoices, and subscriptions',
      },
      {
        type: AgentType.SUPPORT,
        name: 'Support Agent',
        description: 'Handles general inquiries, FAQs, and troubleshooting',
      },
    ];
  }
}

export const agentCoordinator = new AgentCoordinator();
