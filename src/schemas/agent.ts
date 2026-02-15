export const createAgentSchema = {
  body: {
    type: "object",
    required: ["name", "endpoint", "wallet_address"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string" },
      endpoint: { type: "string", format: "uri", maxLength: 512 },
      wallet_address: {
        type: "string",
        pattern: "^0x[a-fA-F0-9]{40}$",
        description: "Ethereum wallet address (0x + 40 hex chars)",
      },
      owner: { type: "string", maxLength: 255 },
      metadata: { type: "object", additionalProperties: true },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        api_key: { type: "string" },
        status: { type: "string" },
        created_at: { type: "string", format: "date-time" },
      },
    },
  },
} as const;

export const updateAgentSchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string" },
      endpoint: { type: "string", format: "uri", maxLength: 512 },
      wallet_address: {
        type: "string",
        pattern: "^0x[a-fA-F0-9]{40}$",
      },
      owner: { type: "string", maxLength: 255 },
      metadata: { type: "object", additionalProperties: true },
    },
    additionalProperties: false,
  },
} as const;

export const agentParams = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
} as const;
