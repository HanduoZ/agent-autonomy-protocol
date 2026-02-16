/**
 * Simple A2AP Agent Example
 * 
 * Demonstrates:
 * - Registering an agent with the registry
 * - Publishing capabilities
 * - Discovering other agents
 * - Querying agent capabilities
 */

interface AgentRegistration {
  name: string;
  capabilities: string[];
  metadata?: {
    version?: string;
    description?: string;
    contact?: string;
  };
}

interface CapabilityQuery {
  required: string[];
  optional?: string[];
}

class SimpleAgent {
  private apiBase: string;
  private agentId: string | null = null;
  private name: string;

  constructor(name: string, apiBase: string = 'http://localhost:3000') {
    this.name = name;
    this.apiBase = apiBase;
  }

  /**
   * Register this agent with the A2AP registry
   */
  async register(capabilities: string[], metadata?: any): Promise<void> {
    const registration: AgentRegistration = {
      name: this.name,
      capabilities,
      metadata
    };

    const response = await fetch(`${this.apiBase}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registration)
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.agentId = data.agentId;
    console.log(`✅ Registered as ${this.name} (ID: ${this.agentId})`);
  }

  /**
   * Discover agents with specific capabilities
   */
  async discover(query: CapabilityQuery): Promise<any[]> {
    const response = await fetch(`${this.apiBase}/api/agents/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`Discovery failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`🔍 Found ${data.agents.length} matching agents`);
    return data.agents;
  }

  /**
   * Get details about a specific agent
   */
  async getAgent(agentId: string): Promise<any> {
    const response = await fetch(`${this.apiBase}/api/agents/${agentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get agent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List all registered agents
   */
  async listAll(): Promise<any[]> {
    const response = await fetch(`${this.apiBase}/api/agents`);
    
    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }

    const data = await response.json();
    return data.agents;
  }

  /**
   * Unregister this agent (cleanup)
   */
  async unregister(): Promise<void> {
    if (!this.agentId) {
      console.log('⚠️  Not registered, nothing to unregister');
      return;
    }

    const response = await fetch(`${this.apiBase}/api/agents/${this.agentId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Unregistration failed: ${response.statusText}`);
    }

    console.log(`✅ Unregistered ${this.name}`);
    this.agentId = null;
  }
}

/**
 * Example Usage
 */
async function main() {
  console.log('🤖 A2AP Simple Agent Example\n');

  // Create a weather agent
  const weatherAgent = new SimpleAgent('WeatherBot');
  
  try {
    // Register with capabilities
    await weatherAgent.register(
      ['weather.forecast', 'weather.current', 'location.geocode'],
      {
        version: '1.0.0',
        description: 'Provides weather forecasts and current conditions',
        contact: 'weather@example.com'
      }
    );

    // Wait a moment for registration to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Discover agents that can provide weather data
    const weatherAgents = await weatherAgent.discover({
      required: ['weather.forecast']
    });

    console.log('\n📋 Weather-capable agents:');
    weatherAgents.forEach((agent, i) => {
      console.log(`  ${i + 1}. ${agent.name} - ${agent.capabilities.join(', ')}`);
    });

    // List all registered agents
    const allAgents = await weatherAgent.listAll();
    console.log(`\n📊 Total registered agents: ${allAgents.length}`);

    // Clean up
    await weatherAgent.unregister();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { SimpleAgent, AgentRegistration, CapabilityQuery };
