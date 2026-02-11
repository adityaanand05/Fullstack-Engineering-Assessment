import type { AgentResponse, ConversationContext } from '../types';
import { AgentType } from '../types';
import { supportTools, type SupportToolFunctions } from './tools/support-tools';

export interface SupportAgent {
  handle: (message: string, context: ConversationContext) => Promise<AgentResponse>;
  getSystemPrompt: (userContext?: Record<string, unknown>) => string;
}

export class SupportAgentImpl implements SupportAgent {
  private tools: SupportToolFunctions;

  constructor(tools: SupportToolFunctions = supportTools) {
    this.tools = tools;
  }

  async handle(message: string, context: ConversationContext): Promise<AgentResponse> {
    const messageLower = message.toLowerCase();

    // Search for FAQs
    const faqs = await this.tools.searchFAQs(message);

    // Check for greeting
    if (this.isGreeting(messageLower)) {
      return {
        content: "👋 Hello! Welcome to our customer support. How can I help you today?\n\n" +
          "I can assist you with:\n" +
          "• Order status and tracking\n" +
          "• Billing and payment questions\n" +
          "• Refunds and invoices\n" +
          "• General product questions\n" +
          "• Account assistance\n\n" +
          "Just describe what you need help with!",
        agentType: AgentType.SUPPORT,
        reasoning: 'Provided greeting and help options',
      };
    }

    // Check for FAQ matches
    if (faqs.length > 0) {
      const bestMatch = faqs[0];
      return {
        content: `**${bestMatch.question}**\n\n${bestMatch.answer}\n\n*Category: ${bestMatch.category}*\n\nIs this helpful, or would you like more assistance?`,
        agentType: AgentType.SUPPORT,
        reasoning: `Matched FAQ: ${bestMatch.category}`,
      };
    }

    // Get conversation history
    const history = await this.tools.queryConversationHistory(context.userId, 5);

    // Handle common support queries
    if (this.isReturnRequest(messageLower)) {
      return {
        content: "📦 **Return Policy**\n\n" +
          "• 30-day return window for most items\n" +
          "• Items must be in original condition with tags\n" +
          "• Some items (personalized, final sale) cannot be returned\n\n" +
          "To start a return:\n" +
          "1. Go to your Order History\n" +
          "2. Select the order and items to return\n" +
          "3. Choose your return reason\n" +
          "4. Print your return label\n\n" +
          "Would you like help starting a return?",
        agentType: AgentType.SUPPORT,
        reasoning: 'Provided return policy information',
      };
    }

    if (this.isAccountIssue(messageLower)) {
      return {
        content: "🔐 **Account Assistance**\n\n" +
          "I can help you with:\n" +
          "• Password reset\n" +
          "• Email address updates\n" +
          "• Account security questions\n" +
          "• Two-factor authentication\n\n" +
          "What account issue are you experiencing?",
        agentType: AgentType.SUPPORT,
        reasoning: 'Provided account assistance options',
      };
    }

    if (this.isContactRequest(messageLower)) {
      return {
        content: "📞 **Contact Us**\n\n" +
          "• **Email**: support@example.com\n" +
          "• **Phone**: 1-800-EXAMPLE (9 AM - 6 PM EST)\n" +
          "• **Live Chat**: Available on our website\n" +
          "• **Help Center**: help.example.com\n\n" +
          "For immediate assistance, I recommend live chat or phone support.",
        agentType: AgentType.SUPPORT,
        reasoning: 'Provided contact information',
      };
    }

    if (this.isProductQuestion(messageLower)) {
      return {
        content: "🔍 **Product Questions**\n\n" +
          "I'd be happy to help with product questions! However, I don't have access to specific product details.\n\n" +
          "For product information, please:\n" +
          "1. Visit the product page on our website\n" +
          "2. Check the product specifications and reviews\n" +
          "3. Contact our sales team for detailed questions\n\n" +
          "Is there anything else I can help you with?",
        agentType: AgentType.SUPPORT,
        reasoning: 'Provided product question guidance',
      };
    }

    let contextInfo = '';
    if (history.success && history.conversations && history.conversations.length > 0) {
      contextInfo = `\n\n*Based on our conversation history, I see you've asked about ${history.conversations.length} topics before.*`;
    }

    return {
      content: "🤔 **I want to make sure I understand your question**\n\n" +
        `Your message: "${message}"${contextInfo}\n\n` +
        "I'm here to help! Here's what I can assist with:\n" +
        "• 📦 Orders: Status, tracking, modifications\n" +
        "• 💳 Billing: Payments, refunds, invoices\n" +
        "• 🔧 Troubleshooting: Product issues, account problems\n" +
        "• ❓ General: FAQs, policies, general questions\n\n" +
        "Could you provide more details so I can better assist you?",
      agentType: AgentType.SUPPORT,
      reasoning: 'Provided general assistance options',
    };
  }

  getSystemPrompt(userContext?: Record<string, unknown>): string {
    return `You are a Support Agent for a customer support system. You handle general inquiries, FAQs, and route complex issues to specialized agents when needed.

Your Responsibilities:
- Answer general questions about the company and policies
- Search and provide FAQ information
- Help with basic account issues
- Escalate complex issues to Order or Billing agents
- Provide empathetic and helpful responses

Available Tools:
- queryConversationHistory(userId, limit) - Get user's previous conversations
- searchFAQs(query) - Search for relevant FAQs
- getUserInfo(userId) - Get user account information
- getRecentInteractions(userId) - Get recent support interactions

Guidelines:
- Be empathetic and patient
- Use FAQ information to provide accurate answers
- Escalate to specialized agents for order/billing issues
- Maintain conversation context
- Provide clear next steps
- Offer to transfer to human agent if needed

${userContext ? `\nUser Context:\n${JSON.stringify(userContext, null, 2)}` : ''}`;
  }

  private isGreeting(message: string): boolean {
    return /^hi|^hello|^hey|^good morning|^good afternoon|^good evening|^what's up/i.test(message);
  }

  private isReturnRequest(message: string): boolean {
    return /return|exchange|send.*back|get.*money.*back|not.*satisfied/i.test(message);
  }

  private isAccountIssue(message: string): boolean {
    return /password|login|can't.*access|locked.*out|account.*issue|security|2fa/i.test(message);
  }

  private isContactRequest(message: string): boolean {
    return /talk.*human|speak.*agent|call.*you|email.*support|contact|phone.*number/i.test(message);
  }

  private isProductQuestion(message: string): boolean {
    return /product|specification|feature|size|color|dimension|weight|compatibility/i.test(message);
  }
}

export const supportAgent = new SupportAgentImpl();
