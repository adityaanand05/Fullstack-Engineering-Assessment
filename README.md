# 🤖 AI-Powered Customer Support System

A full-stack customer support system with a multi-agent architecture. A router agent analyzes incoming queries and delegates to specialized sub-agents, each with access to relevant tools.

## 🏗️ Architecture

### Multi-Agent System

```
Router Agent (Parent)
├── Analyzes incoming customer queries
├── Classifies intent and delegates to appropriate sub-agent
└── Handles fallback for unclassified queries

Sub-Agents:
├── 📦 Order Agent
│   ├── Handles order status, tracking, modifications, cancellations
│   └── Tools: query conversation history
│
├── 💳 Billing Agent
│   ├── Handles payment issues, refunds, invoices, subscription queries
│   └── Tools: get invoice details, check refund status
│
└── ❓ Support Agent
    ├── Handles general support inquiries, FAQs, troubleshooting
    └── Tools: query conversation history, search FAQs
```

### Tech Stack

- **Frontend**: React + Vite
- **Backend**: Hono.dev
- **Database**: PostgreSQL
- **ORM**: Prisma
- **AI**: Vercel AI SDK
- **Monorepo**: Turborepo

## 📁 Project Structure

```
ai-customer-support/
├── apps/
│   ├── backend/           # Hono backend server
│   │   ├── src/
 │   ├── agents│   │  /          # Multi-agent system
│   │   │   │   ├── tools/       # Agent tools
│   │   │   │   ├── router.ts     # Router agent
│   │   │   │   ├── order-agent.ts
│   │   │   │   ├── billing-agent.ts
│   │   │   │   ├── support-agent.ts
│   │   │   │   └── coordinator.ts
│   │   │   ├── routes/          # API routes
│   │   │   │   ├── chat.ts
│   │   │   │   └── agents.ts
│   │   │   ├── services/        # Business logic
│   │   │   │   └── conversation.ts
│   │   │   ├── middleware/     # Error handling, logging
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── db/             # Database & seed
│   │   │   └── index.ts        # Server entry
│   │   └── prisma/             # Database schema
│   │
│   └── frontend/         # React frontend
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       └── vite.config.ts
│
├── packages/
│   └── shared/          # Shared types & utilities
│
├── package.json         # Root package.json
├── turbo.json           # Turborepo config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Bun (recommended) or npm/yarn

### Installation

1. **Clone and install dependencies:**

```bash
# Install dependencies for all apps
bun install

# Or with npm
npm install
```

2. **Set up the database:**

```bash
# Copy environment file
cp apps/backend/.env.example apps/backend/.env

# Edit .env with your database URL
# DATABASE_URL="postgresql://user:password@localhost:5432/ai_customer_support"

# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Seed with sample data
bun run db:seed
```

3. **Start development servers:**

```bash
# Start all apps (backend + frontend)
bun run dev
```

Or run individually:

```bash
# Terminal 1 - Backend
cd apps/backend
bun run dev

# Terminal 2 - Frontend
cd apps/frontend
bun run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📡 API Endpoints

### Chat API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/messages` | Send a new message |
| GET | `/api/chat/conversations` | List user conversations |
| GET | `/api/chat/conversations/:id` | Get conversation history |
| DELETE | `/api/chat/conversations/:id` | Delete conversation |

### Agents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all available agents |
| GET | `/api/agents/:type/capabilities` | Get agent capabilities |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## 💬 Example Usage

### Send a Message

```bash
curl -X POST http://localhost:3001/api/chat/messages \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -d '{"conversationId": null, "message": "Track my order ORD-001"}'
```

Response:
```json
{
  "success": true,
  "conversationId": "clx1234567890",
  "message": {
    "id": "msg123",
    "role": "ASSISTANT",
    "content": "Your order ORD-001 is currently shipped...",
    "agentType": "ORDER"
  },
  "response": "Your order ORD-001 is currently shipped...",
  "reasoning": "Matched ORDER keywords in message"
}
```

## 🧪 Testing

```bash
# Run tests for all packages
bun run test

# Run tests for backend
cd apps/backend && bun test

# Run tests for frontend
cd apps/frontend && bun test
```

## 📦 Building for Production

```bash
# Build all packages
bun run build

# Build backend
cd apps/backend && bun run build

# Build frontend
cd apps/frontend && bun run build
```

## 🎯 Features

- ✅ Multi-agent routing system
- ✅ Keyword-based intent classification
- ✅ Order management (tracking, status, cancellation)
- ✅ Billing operations (payments, refunds, invoices)
- ✅ Support FAQ system
- ✅ Conversation persistence
- ✅ Real-time typing indicators
- ✅ Context-aware responses
- ✅ Error handling middleware
- ✅ Rate limiting ready
- ✅ Type-safe API (Hono RPC)

## 🔒 Security

- CORS configuration
- Helmet security headers
- Error handling middleware
- Input validation

## 📈 Future Improvements

- Add AI-powered intent classification with OpenAI/LLM
- Implement streaming responses
- Add Redis for caching
- Implement rate limiting
- Add authentication (JWT)
- Real-time WebSocket support
- Analytics dashboard
- Multi-language support

## 📄 License

MIT License - feel free to use this project for learning and development.
