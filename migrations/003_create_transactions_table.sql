CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_agent_id UUID NOT NULL REFERENCES agents(id),
  seller_agent_id UUID NOT NULL REFERENCES agents(id),
  capability_id UUID NOT NULL REFERENCES capabilities(id),
  status VARCHAR(50) NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_seller ON transactions(seller_agent_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_agent_id);
CREATE INDEX idx_transactions_capability ON transactions(capability_id);
