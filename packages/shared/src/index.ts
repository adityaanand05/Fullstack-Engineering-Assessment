// Shared types for the AI Customer Support System

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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  agentType?: AgentType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  agentType: AgentType;
  context?: Record<string, unknown>;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  conversationId: string;
  message: {
    id: string;
    role: MessageRole;
    content: string;
    agentType: AgentType;
  };
  response: string;
  reasoning?: string;
}

export interface Agent {
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
}

export interface AgentCapabilities {
  name: string;
  description: string;
  tools: string[];
}

export interface RouteDecision {
  agentType: AgentType;
  confidence: number;
  reasoning: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}
