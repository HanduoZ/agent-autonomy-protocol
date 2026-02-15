-- Reputation scores table (updated via trigger, not a materialized view)
CREATE TABLE reputation_scores (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  total_transactions INTEGER NOT NULL DEFAULT 0,
  successful_transactions INTEGER NOT NULL DEFAULT 0,
  success_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to recalculate reputation from the last 100 transactions
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_successful INTEGER;
  v_rate DOUBLE PRECISION;
  v_avg_latency DOUBLE PRECISION;
BEGIN
  -- Count over last 100 transactions for the seller
  SELECT
    COUNT(*),
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END),
    COALESCE(AVG(t.latency_ms), 0)
  INTO v_total, v_successful, v_avg_latency
  FROM (
    SELECT status, latency_ms
    FROM transactions
    WHERE seller_agent_id = NEW.seller_agent_id
    ORDER BY created_at DESC
    LIMIT 100
  ) t;

  v_rate := CASE WHEN v_total > 0 THEN v_successful::DOUBLE PRECISION / v_total ELSE 0 END;

  INSERT INTO reputation_scores (agent_id, total_transactions, successful_transactions, success_rate, avg_latency_ms, score, updated_at)
  VALUES (NEW.seller_agent_id, v_total, v_successful, v_rate, v_avg_latency, v_rate, NOW())
  ON CONFLICT (agent_id) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    success_rate = EXCLUDED.success_rate,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    score = EXCLUDED.score,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_reputation
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_reputation_score();
