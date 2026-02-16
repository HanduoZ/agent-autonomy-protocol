-- Add public key column for Ed25519 identity verification
ALTER TABLE agents ADD COLUMN public_key TEXT;
ALTER TABLE agents ADD COLUMN key_algorithm TEXT DEFAULT 'ed25519';

-- Index for looking up agents by public key
CREATE INDEX idx_agents_public_key ON agents(public_key);

-- Migration notes:
-- Existing agents will have NULL public_key (legacy, pre-identity)
-- New agents must provide public_key on registration
-- Future: require public_key NOT NULL after migration period
