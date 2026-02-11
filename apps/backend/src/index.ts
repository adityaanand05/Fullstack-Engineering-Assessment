import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import chatRoutes from './routes/chat';
import agentsRoutes from './routes/agents';
import { errorHandler, requestLogger, cors as corsMiddleware, helmet as helmetMiddleware } from './middleware/error';

const app = new Hono();

// Apply global middleware
app.use('*', corsMiddleware);
app.use('*', helmetMiddleware);
app.use('*', errorHandler);
app.use('*', requestLogger);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount routes
app.route('/api/chat', chatRoutes);
app.route('/api/agents', agentsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler at app level
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: {
      message: 'Internal Server Error',
      status: 500,
    },
  }, 500);
});

// Start server
const PORT = parseInt(process.env.PORT || '4000', 10);

console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🤖 AI Customer Support System - Backend               ║
║                                                          ║
║   Server running on: http://localhost:${PORT}             ║
║                                                          ║
║   Endpoints:                                             ║
║   • GET  /api/health          - Health check            ║
║   • POST /api/chat/messages    - Send message            ║
║   • GET  /api/chat/conversations - List conversations    ║
║   • GET  /api/chat/conversations/:id - Get conversation  ║
║   • DELETE /api/chat/conversations/:id - Delete chat   ║
║   • GET  /api/agents           - List agents            ║
║   • GET  /api/agents/:type/capabilities - Agent info   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port: PORT,
});

export default app;
