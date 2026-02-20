-- Add optional Ed25519 keypair authentication to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'api_key';
ALTER TABLE agents DROP COLUMN IF EXISTS key_algorithm;

-- Unique partial index for public key lookups during signature verification
DROP INDEX IF EXISTS idx_agents_public_key;
CREATE UNIQUE INDEX idx_agents_public_key ON agents(public_key) WHERE public_key IS NOT NULL;
