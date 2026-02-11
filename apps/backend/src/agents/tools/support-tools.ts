import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SupportToolFunctions {
  queryConversationHistory: (userId: string, limit?: number) => Promise<ConversationHistoryResult>;
  searchFAQs: (query: string) => Promise<FAQResult[]>;
  getUserInfo: (userId: string) => Promise<UserInfoResult>;
  getRecentInteractions: (userId: string) => Promise<InteractionSummary[]>;
}

export interface ConversationHistoryResult {
  success: boolean;
  conversations?: Array<{
    id: string;
    title: string;
    agentType: string;
    createdAt: Date;
    updatedAt: Date;
    lastMessage?: string;
  }>;
  error?: string;
}

export interface FAQResult {
  question: string;
  answer: string;
  category: string;
  relevance: number;
}

export interface UserInfoResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    orderCount: number;
    totalSpent: number;
    memberSince: Date;
  };
  error?: string;
}

export interface InteractionSummary {
  id: string;
  type: string;
  summary: string;
  date: Date;
  status: string;
}

// FAQ data for the support agent
const faqData = [
  {
    category: 'General',
    question: 'How do I track my order?',
    answer: 'You can track your order by logging into your account and visiting the "Orders" section. Each order will show its current status and tracking number if available.',
  },
  {
    category: 'General',
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy for most items. Items must be in their original condition with tags attached. Some items like personalized products cannot be returned.',
  },
  {
    category: 'General',
    question: 'How can I contact customer support?',
    answer: 'You can reach our customer support team via email at support@example.com, through live chat on our website, or by calling 1-800-EXAMPLE between 9 AM and 6 PM EST.',
  },
  {
    category: 'Orders',
    question: 'How do I cancel my order?',
    answer: 'Orders can only be cancelled before they are shipped. Go to your order history, find the order you want to cancel, and click the "Cancel Order" button. If the order has already shipped, you\'ll need to initiate a return instead.',
  },
  {
    category: 'Orders',
    question: 'Can I modify my order after placing it?',
    answer: 'You can modify your order (like shipping address or item quantities) only before it begins processing. Once processing starts, modifications are not possible.',
  },
  {
    category: 'Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay. We also offer buy-now-pay-later options through Klarna and Afterpay.',
  },
  {
    category: 'Billing',
    question: 'How do I get a refund?',
    answer: 'Refunds are processed to the original payment method within 5-7 business days after we receive and inspect the returned item. You\'ll receive an email confirmation once the refund is processed.',
  },
  {
    category: 'Billing',
    question: 'Why was my payment declined?',
    answer: 'Payment declines can happen for various reasons: incorrect card information, insufficient funds, or your bank\'s fraud protection. Please check your card details or try a different payment method.',
  },
];

export const supportTools = {
  queryConversationHistory: async (userId: string, limit: number = 10): Promise<ConversationHistoryResult> => {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return {
        success: true,
        conversations: conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Untitled Conversation',
          agentType: conv.agentType,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          lastMessage: conv.messages[0]?.content,
        })),
      };
    } catch (error) {
      console.error('Error querying conversation history:', error);
      return { success: false, error: 'Failed to query conversation history' };
    }
  },

  searchFAQs: async (query: string): Promise<FAQResult[]> => {
    const queryLower = query.toLowerCase();
    
    // Simple keyword-based matching
    const results = faqData
      .map((faq) => {
        const relevance = calculateRelevance(queryLower, faq.question.toLowerCase() + ' ' + faq.answer.toLowerCase());
        return { ...faq, relevance };
      })
      .filter((result) => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

    return results;
  },

  getUserInfo: async (userId: string): Promise<UserInfoResult> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: { conversations: true, orders: true },
          },
          orders: {
            select: { total: true },
          },
        },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          orderCount: user.orders.length,
          totalSpent: user.orders.reduce((sum: number, order: any) => sum + Number(order.total), 0),
          memberSince: user.createdAt,
        },
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { success: false, error: 'Failed to fetch user info' };
    }
  },

  getRecentInteractions: async (userId: string): Promise<InteractionSummary[]> => {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return conversations.map((conv: any) => ({
        id: conv.id,
        type: 'conversation',
        summary: conv.messages[0]?.content.substring(0, 100) || 'No messages',
        date: conv.updatedAt,
        status: 'completed',
      }));
    } catch (error) {
      console.error('Error fetching recent interactions:', error);
      return [];
    }
  },
};

// Helper function to calculate relevance score
function calculateRelevance(query: string, text: string): number {
  const queryWords = query.split(/\s+/);
  const textContent = text;
  
  let score = 0;
  for (const queryWord of queryWords) {
    if (textContent.includes(queryWord)) {
      score += 1;
      if (textContent.startsWith(queryWord)) {
        score += 0.5;
      }
    }
  }
  
  return score;
}
