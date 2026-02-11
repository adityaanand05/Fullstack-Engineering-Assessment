import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { RouteDecision, ConversationContext } from '../types';
import { AgentType } from '../types';

export interface LLMRouterAgent {
  route: (message: string, context?: ConversationContext) => Promise<RouteDecision>;
  getSystemPrompt: () => string;
}

export class LLMRouterAgentImpl implements LLMRouterAgent {
  private model = google('gemini-2.0-flash');

  async route(message: string): Promise<RouteDecision> {
    try {
      const systemPrompt = this.getSystemPrompt();
      
      const { text } = await generateText({
        model: this.model as any,
        system: systemPrompt,
        prompt: `User message: "${message}"

Respond with ONLY valid JSON (no markdown, no explanations):
{"agentType": "ORDER|BILLING|SUPPORT", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`,
        temperature: 0.3,
      });

      // Parse the JSON response
      const cleanedText = text.trim().replace(/```json\n?|\n?```/g, '');
      const result = JSON.parse(cleanedText);

      return {
        agentType: result.agentType as AgentType,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('Error in Gemini routing:', error);
      // Fallback to support agent
      return {
        agentType: AgentType.SUPPORT,
        confidence: 0.5,
        reasoning: 'LLM routing failed, using fallback',
      };
    }
  }

  getSystemPrompt(): string {
    return `You are an intelligent routing agent for a customer support system. Your job is to classify customer messages into one of three categories:

1. **ORDER** (AgentType: ORDER) - Messages about:
   - Order status, tracking, or delivery information
   - Order cancellations or modifications
   - Order placement or confirmation
   - Shipping addresses or delivery dates
   - "Where is my order?", "Can I cancel my order?", "Track my package"

2. **BILLING** (AgentType: BILLING) - Messages about:
   - Payments, charges, or billing issues
   - Refunds or credit
   - Invoices or receipts
   - Subscription management
   - Price inquiries or payment methods
   - "I was charged twice", "Can I get a refund?", "What's the cost?"

3. **SUPPORT** (AgentType: SUPPORT) - Messages about:
   - General help or questions
   - Account issues (login, password reset)
   - Product information or FAQs
   - Returns or exchanges
   - Warranty or technical support
   - Any inquiry that doesn't fit ORDER or BILLING
   - "How do I...?", "I have a problem", "Can you help?"

Instructions:
- Analyze the customer message carefully
- Return the BEST matching agent type
- Provide a confidence score between 0 and 1 (higher = more certain)
- If multiple categories fit, choose the PRIMARY intent
- Default to SUPPORT if uncertain`;
  }
}

export const llmRouter = new LLMRouterAgentImpl();
