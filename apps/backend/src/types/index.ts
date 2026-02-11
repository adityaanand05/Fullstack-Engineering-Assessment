// Type definitions that match the Prisma schema
export enum AgentType {
  ROUTER = 'ROUTER',
  SUPPORT = 'SUPPORT',
  ORDER = 'ORDER',
  BILLING = 'BILLING',
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  agentType?: AgentType;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  previousMessages: ChatMessage[];
  agentType: AgentType;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  agentType: AgentType;
  toolCalls?: ToolCall[];
  reasoning?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface RouteDecision {
  agentType: AgentType;
  confidence: number;
  reasoning: string;
}

export interface StreamingState {
  isTyping: boolean;
  currentAgent: AgentType | null;
  thinking: boolean;
  messageId?: string;
}

export interface APIError {
  message: string;
  cause?: string;
  status: number;
}
