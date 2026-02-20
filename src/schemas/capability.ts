export const createCapabilitySchema = {
  body: {
    type: "object",
    required: ["name", "pricing", "sla", "input_schema", "output_schema"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string" },
      category: { type: "string", maxLength: 100 },
      pricing: {
        type: "object",
        required: ["model", "amount", "currency", "network"],
        properties: {
          model: { type: "string", enum: ["per_request", "per_second", "flat"] },
          amount: { type: "string", pattern: "^[0-9]+$" },
          currency: { type: "string" },
          network: { type: "string" },
        },
        additionalProperties: false,
      },
      sla: {
        type: "object",
        required: ["max_latency_ms", "availability"],
        properties: {
          max_latency_ms: { type: "integer", minimum: 1 },
          availability: { type: "number", minimum: 0, maximum: 1 },
          max_payload_bytes: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
      input_schema: { type: "object" },
      output_schema: { type: "object" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        agent_id: { type: "string", format: "uuid" },
        status: { type: "string" },
        created_at: { type: "string", format: "date-time" },
      },
    },
  },
} as const;

export const updateCapabilitySchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string" },
      category: { type: "string", maxLength: 100 },
      pricing: {
        type: "object",
        required: ["model", "amount", "currency", "network"],
        properties: {
          model: { type: "string", enum: ["per_request", "per_second", "flat"] },
          amount: { type: "string", pattern: "^[0-9]+$" },
          currency: { type: "string" },
          network: { type: "string" },
        },
        additionalProperties: false,
      },
      sla: {
        type: "object",
        required: ["max_latency_ms", "availability"],
        properties: {
          max_latency_ms: { type: "integer", minimum: 1 },
          availability: { type: "number", minimum: 0, maximum: 1 },
          max_payload_bytes: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
      input_schema: { type: "object" },
      output_schema: { type: "object" },
    },
    additionalProperties: false,
  },
} as const;

export const capabilitySearchSchema = {
  querystring: {
    type: "object",
    properties: {
      q: { type: "string" },
      category: { type: "string" },
      max_price: { type: "integer", minimum: 0 },
      min_reputation: { type: "number", minimum: 0, maximum: 1 },
      currency: { type: "string" },
      network: { type: "string" },
      verified: { type: "boolean", description: "Filter by agent verification status" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      offset: { type: "integer", minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
} as const;
