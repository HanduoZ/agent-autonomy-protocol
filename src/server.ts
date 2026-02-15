import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { registerRateLimit } from "./middleware/rateLimit.js";
import { agentRoutes } from "./routes/agents.js";
import { capabilityRoutes } from "./routes/capabilities.js";
import { transactionRoutes } from "./routes/transactions.js";

export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false });

  // Plugins
  await app.register(cors);
  await app.register(swagger, {
    openapi: {
      info: {
        title: "A2A Marketplace Protocol",
        description: "Agent-to-Agent capability marketplace registry API",
        version: "0.1.0",
      },
      servers: [{ url: "http://localhost:3000" }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await registerRateLimit(app);

  // Routes
  await app.register(agentRoutes, { prefix: "/v1" });
  await app.register(capabilityRoutes, { prefix: "/v1" });
  await app.register(transactionRoutes, { prefix: "/v1" });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
