CREATE TABLE IF NOT EXISTS watchtower_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  page TEXT,
  timestamp TEXT NOT NULL,
  country TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  user_agent TEXT,
  referrer TEXT,
  data_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_watchtower_timestamp ON watchtower_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_watchtower_visitor ON watchtower_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_watchtower_event ON watchtower_events(event);
