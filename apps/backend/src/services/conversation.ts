import { PrismaClient } from '@prisma/client';
import type { ConversationContext } from '../types';
import { AgentType, MessageRole } from '../types';
import { agentCoordinator } from '../agents/coordinator';

const prisma = new PrismaClient();

export interface SendMessageInput {
  userId: string;
  conversationId?: string;
  message: string;
}

export interface ConversationResult {
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

export interface GetConversationsInput {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetConversationInput {
  conversationId: string;
  userId: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  agentType: AgentType;
  messageCount: number;
  lastMessage?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface ConversationDetail {
  id: string;
  title: string;
  agentType: AgentType;
  context: Record<string, unknown> | null;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    agentType: AgentType | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteConversationResult {
  success: boolean;
}

export class ConversationService {
  private coordinator = agentCoordinator;

  async sendMessage(input: SendMessageInput): Promise<ConversationResult> {
    const { userId, conversationId, message } = input;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50, // Limit for context
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.userId !== userId) {
        throw new Error('Unauthorized access to conversation');
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + '...',
          agentType: 'ROUTER' as AgentType,
          messages: {
            create: [],
          },
        },
        include: {
          messages: true,
        },
      });
    }

    // Build conversation context
    const context: ConversationContext = {
      conversationId: conversation.id,
      userId,
      previousMessages: conversation.messages.map((m: typeof conversation.messages[0]) => ({
        role: m.role,
        content: m.content,
        agentType: m.agentType || undefined,
      })),
      agentType: conversation.agentType,
      metadata: (conversation.context as Record<string, unknown>) || {},
    };

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // Process message with multi-agent system
    const response = await this.coordinator.processMessage(message, context);

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response.content,
        agentType: response.agentType,
        metadata: response.reasoning ? { reasoning: response.reasoning } : undefined,
      },
    });

    // Update conversation with new context
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        agentType: response.agentType,
        updatedAt: new Date(),
        context: {
          ...context.metadata,
          lastAgentType: response.agentType,
          lastMessageAt: new Date().toISOString(),
        } as any,
      },
    });

    return {
      success: true,
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        agentType: assistantMessage.agentType!,
      },
      response: response.content,
      reasoning: response.reasoning,
    };
  }

  async getConversations(input: GetConversationsInput): Promise<ConversationSummary[]> {
    const { userId, limit = 20, offset = 0 } = input;

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map((conv: typeof conversations[0]) => ({
      id: conv.id,
      title: conv.title,
      agentType: conv.agentType,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0]?.content,
      lastMessageAt: conv.updatedAt,
      createdAt: conv.createdAt,
    } as ConversationSummary));
  }

  async getConversation(input: GetConversationInput): Promise<ConversationDetail> {
    const { conversationId, userId } = input;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('Unauthorized access to conversation');
    }

    return {
      id: conversation.id,
      title: conversation.title,
      agentType: conversation.agentType,
      context: conversation.context as Record<string, unknown> | null,
      messages: conversation.messages.map((m: typeof conversation.messages[0]) => ({
        id: m.id,
        role: m.role as MessageRole,
        content: m.content,
        agentType: m.agentType,
        metadata: m.metadata as Record<string, unknown> | null,
        createdAt: m.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  async deleteConversation(conversationId: string, userId: string): Promise<DeleteConversationResult> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('Unauthorized access to conversation');
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }
}

export const conversationService = new ConversationService();
