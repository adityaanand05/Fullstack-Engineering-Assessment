import { Hono } from 'hono';
import { AgentType } from '../types';
import { agentCoordinator } from '../agents/coordinator';

const app = new Hono();

// GET /api/agents - List all available agents
app.get('/', async (c) => {
  try {
    const agents = agentCoordinator.listAgents();
    
    return c.json({
      agents: agents.map((agent) => ({
        type: agent.type,
        name: agent.name,
        description: agent.description,
        capabilities: agentCoordinator.getAgentCapabilities(agent.type),
      })),
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return c.json({ error: 'Failed to list agents' }, 500);
  }
});

// GET /api/agents/:type/capabilities - Get specific agent capabilities
app.get('/:type/capabilities', async (c) => {
  try {
    const type = c.req.param('type').toUpperCase();
    
    // Validate agent type
    const validTypes = [AgentType.ROUTER, AgentType.ORDER, AgentType.BILLING, AgentType.SUPPORT];
    if (!validTypes.includes(type as AgentType)) {
      return c.json({ error: 'Invalid agent type' }, 400);
    }

    const capabilities = agentCoordinator.getAgentCapabilities(type as AgentType);
    
    return c.json(capabilities);
  } catch (error) {
    console.error('Error getting agent capabilities:', error);
    return c.json({ error: 'Failed to get agent capabilities' }, 500);
  }
});

export default app;
