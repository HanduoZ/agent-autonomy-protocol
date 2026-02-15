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
      // Use higher limits in test environment to avoid rate limit issues
      max: process.env.NODE_ENV === "test" ? 1000 : 10,
      timeWindow: "1 hour",
    },
  },
};
