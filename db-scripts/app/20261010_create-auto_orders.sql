-- AutoOrder -> auto_orders (timestamps default true, underscored:true)
CREATE TABLE IF NOT EXISTS auto_orders (
  id              SERIAL PRIMARY KEY,
  trade_id        INTEGER NOT NULL,
  kind            VARCHAR(16) NOT NULL,
  mode            VARCHAR(8) NOT NULL,
  tradingsymbol   VARCHAR(32) NOT NULL,
  "transaction"   VARCHAR(4) NOT NULL,
  qty             INTEGER NOT NULL,
  order_type      VARCHAR(8) NOT NULL,
  trigger_price   NUMERIC(10, 2),
  limit_price     NUMERIC(10, 2),
  broker_order_id VARCHAR(32),
  status          VARCHAR(16) NOT NULL,
  detail          VARCHAR(400),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL
);
