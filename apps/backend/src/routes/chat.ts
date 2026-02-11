import { Hono } from 'hono';
import { conversationService } from '../services/conversation';

const app = new Hono();

// Middleware to extract user ID (simplified for demo)
const getUserId = (c: any) => {
  // In production, this would extract from JWT token or session
  return c.req.header('X-User-Id') || 'demo-user';
};

// POST /api/chat/messages - Send a new message
app.post('/messages', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    
    const { conversationId, message } = body;

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Message is required' }, 400);
    }

    const result = await conversationService.sendMessage({
      userId,
      conversationId,
      message: message.trim(),
    });

    return c.json(result);
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// GET /api/chat/conversations - List user conversations
app.get('/conversations', async (c) => {
  try {
    const userId = getUserId(c);
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const conversations = await conversationService.getConversations({
      userId,
      limit,
      offset,
    });

    return c.json({ conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return c.json({ error: 'Failed to list conversations' }, 500);
  }
});

// GET /api/chat/conversations/:id - Get conversation history
app.get('/conversations/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const conversationId = c.req.param('id');

    const conversation = await conversationService.getConversation({
      conversationId,
      userId,
    });

    return c.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    if ((error as Error).message === 'Conversation not found') {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    if ((error as Error).message === 'Unauthorized access to conversation') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    return c.json({ error: 'Failed to get conversation' }, 500);
  }
});

// DELETE /api/chat/conversations/:id - Delete conversation
app.delete('/conversations/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const conversationId = c.req.param('id');

    const result = await conversationService.deleteConversation(conversationId, userId);

    return c.json(result);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    if ((error as Error).message === 'Conversation not found') {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    if ((error as Error).message === 'Unauthorized access to conversation') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    return c.json({ error: 'Failed to delete conversation' }, 500);
  }
});

export default app;
