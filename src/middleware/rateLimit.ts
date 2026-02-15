import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: "1 hour",
  });
}

/** Route-level config for the agent registration endpoint (stricter). */
export const registrationRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 hour",
    },
  },
};
