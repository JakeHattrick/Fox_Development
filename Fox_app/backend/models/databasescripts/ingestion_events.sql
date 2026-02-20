
-- DROP the table first (be careful, this deletes all rows)
DROP TABLE IF EXISTS ingestion_events;

-- CREATE table without NOT NULL constraints
CREATE TABLE ingestion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(32),               -- can be NULL now
    source_host VARCHAR(64),
    received_at TIMESTAMPTZ,          -- can be NULL
    event_time TIMESTAMPTZ,           -- optional, can be NULL
    event_type VARCHAR(64),           -- optional, can be NULL
    payload JSONB,                    -- optional, can be NULL
    status VARCHAR(32),               -- optional, can be NULL
    processed_at TIMESTAMPTZ
);


CREATE TABLE ingestion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source VARCHAR(32) NOT NULL DEFAULT 'jump_server',
    source_host VARCHAR(64),

    received_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),

    event_type VARCHAR(32) DEFAULT 'fixture_status',

    payload JSONB,

    status VARCHAR(16) DEFAULT 'RECEIVED',
    error_message TEXT
);

CREATE INDEX idx_ingestion_events_received_at
    ON ingestion_events (received_at);

CREATE INDEX idx_ingestion_events_payload_gin
    ON ingestion_events
    USING GIN (payload);


-- Next step (very important): prove the table works

INSERT INTO ingestion_events (source, payload, received_at)
VALUES (
  'jump_server',
  '{
    "fixture_name": "Tester001",
    "gen_type": "Gen 5 B tester",
    "rack": "Rack-01",
    "fixture_sn": "SN123456",
    "test_type": "testing",
    "test_station": "ST01",
    "ip_address": "10.0.0.45",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "creator": "Ann",
    "left-PN": "",
    "left-SN": "",
    "left-logpath": "",
    "right-PN": "",
    "right-SN": "",
    "right-logpath": ""
  }'::jsonb,
  NOW()
);

-- Verify insert : You should see 1 row

SELECT id, received_at, source
FROM ingestion_events
ORDER BY received_at DESC;

-- Then:

SELECT payload->>'fixture_name',
       payload->>'creator'
FROM ingestion_events;
