# Simple Agent Example

A minimal example demonstrating how to use the A2AP registry.

## What This Shows

- **Registration**: How an agent registers itself with capabilities
- **Discovery**: How to find other agents by their capabilities
- **Querying**: How to get information about registered agents
- **Cleanup**: How to properly unregister when done

## Running the Example

### 1. Start the A2AP Server

```bash
# From the repository root
npm install
npm run dev
```

The server will start on `http://localhost:3000`.

### 2. Run the Example

```bash
# In another terminal
cd examples/simple-agent
npx tsx agent.ts
```

## Expected Output

```
🤖 A2AP Simple Agent Example

✅ Registered as WeatherBot (ID: agent-123abc...)
🔍 Found 1 matching agents

📋 Weather-capable agents:
  1. WeatherBot - weather.forecast, weather.current, location.geocode

📊 Total registered agents: 1
✅ Unregistered WeatherBot
```

## Code Walkthrough

### Registering an Agent

```typescript
const agent = new SimpleAgent('WeatherBot');

await agent.register(
  ['weather.forecast', 'weather.current'],  // capabilities
  {
    version: '1.0.0',
    description: 'Weather service'
  }
);
```

The registry assigns a unique ID and stores the capabilities.

### Discovering Agents

```typescript
const agents = await agent.discover({
  required: ['weather.forecast']  // must have this capability
});
```

Returns all agents that match the required capabilities.

### Getting Agent Details

```typescript
const details = await agent.getAgent(agentId);
console.log(details.capabilities);  // [ 'weather.forecast', ... ]
```

## Extending This Example

Try modifying the code to:

1. **Register multiple agents** with different capabilities
2. **Discover agents with multiple required capabilities**
3. **Add optional capabilities** to discovery queries
4. **Use metadata** to filter agents by version or type

Example:

```typescript
// Register a translation agent
const translator = new SimpleAgent('TranslateBot');
await translator.register(['translate.text', 'language.detect']);

// Discover agents that can both forecast weather AND translate
const multiCapable = await translator.discover({
  required: ['weather.forecast', 'translate.text']
});
// Returns empty array - no agent has both capabilities
```

## Next Steps

- **See [docs/API.md](../../docs/API.md)** for full API reference
- **Read [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)** to understand the protocol design
- **Check [examples/](../)** for more advanced examples (coming soon)

## Real-World Usage

In production, agents would:

1. **Register on startup** with their actual capabilities
2. **Periodically discover** collaborators as needs arise
3. **Cache discovery results** to reduce API calls
4. **Handle errors gracefully** (network issues, registry downtime)
5. **Unregister on shutdown** to keep the registry clean

See the production examples (coming soon) for error handling and resilience patterns.
