import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: string;
  reasoning?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  agentType: string;
  lastMessage: string;
  updatedAt: Date;
}

const USER_ID = 'demo-user';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setIsTyping(true);

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': USER_ID,
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: data.message.id,
        role: 'assistant',
        content: data.response,
        agentType: data.message.agentType,
        reasoning: data.reasoning,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentConversationId(data.conversationId);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role === 'USER' ? 'user' : 'assistant',
            content: m.content,
            agentType: m.agentType,
            timestamp: new Date(m.createdAt),
          }))
        );
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>🤖 AI Customer Support</h1>
        <p>Ask me anything about your orders, billing, or general questions!</p>
      </div>

      {conversations.length > 0 && messages.length === 0 && (
        <div className="conversation-list">
          <h2>Recent Conversations</h2>
          {conversations.slice(0, 5).map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
              onClick={() => loadConversation(conv.id)}
            >
              <div className="conversation-title">{conv.title || 'Chat'}</div>
              <div className="conversation-meta">
                {conv.agentType} • {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <p style={{ marginBottom: '16px' }}>👋 Welcome! How can I help you today?</p>
            <p style={{ fontSize: '14px' }}>Try asking about:</p>
            <ul style={{ listStyle: 'none', marginTop: '12px' }}>
              <li>📦 "Track my order ORD-001"</li>
              <li>💳 "Check my payment history"</li>
              <li>💰 "What's my refund status?"</li>
              <li>❓ "How do I return an item?"</li>
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
              {message.agentType && (
                <span className={`agent-badge ${message.agentType.toLowerCase()}`}>
                  {message.agentType}
                </span>
              )}
            </div>
            <div className="message-content">{message.content}</div>
            {message.reasoning && (
              <div className="reasoning">Thinking: {message.reasoning}</div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="message assistant">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="chat-send-button"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="agent-info">
        <h3>Available Agents</h3>
        <div className="agent-grid">
          <div className="agent-card">
            <div className="agent-name">📦 Order Agent</div>
            <div className="agent-desc">Orders, tracking, delivery</div>
          </div>
          <div className="agent-card">
            <div className="agent-name">💳 Billing Agent</div>
            <div className="agent-desc">Payments, refunds, invoices</div>
          </div>
          <div className="agent-card">
            <div className="agent-name">❓ Support Agent</div>
            <div className="agent-desc">General help, FAQs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
