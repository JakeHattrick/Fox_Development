-- Seed script: Insert 30 days of "Testing" usage rows for 20 fixtures (LA + RA)
-- NOTE: This script assumes fixture_parts for LA and RA already exist for each fixture.
--        It will insert into your existing `usage` table only.
-- Requires: pgcrypto (for gen_random_uuid()).

BEGIN;

-- 1) Define the fixtures and assigned station (cycle order)
WITH fixtures_and_stations(fixture_name, station) AS (
  VALUES
    ('NCT017-01','BAT'),
    ('NCT017-02','BIT'),
    ('NCT017-03','PHT'),
    ('NCT017-04','FCT'),
    ('NCT020-01','FPF'),
    ('NCT020-02','IST'),
    ('NCT020-03','OQC'),
    ('NCT020-04','BAT'),
    ('NCT025-01','BIT'),
    ('NCT025-02','PHT'),
    ('NCT025-03','FCT'),
    ('NCT025-04','FPF'),
    ('NCT030-01','IST'),
    ('NCT030-02','OQC'),
    ('NCT030-03','BAT'),
    ('NCT030-04','BIT'),
    ('NCT035-01','PHT'),
    ('NCT035-02','FCT'),
    ('NCT035-03','FPF'),
    ('NCT035-04','IST'
    )
),

-- 2) days 0..29 -> last 30 days (0 = today, 29 = 29 days ago)
days AS (
  SELECT generate_series(0,29) AS day_offset
),

-- 3) pn_sn: one row per fixture per day with generated GPU PN and base GPU SN and create_date (midday)
pn_sn AS (
  SELECT
    fs.fixture_name,
    fs.station,
    d.day_offset,
    -- GPU PN format: 692-2G520-0XXX-0XX
    ('692-2G520-0' ||
      lpad( ((floor(random() * 900)::int) + 100)::text, 3, '0')
      || '-0' ||
      lpad( (floor(random() * 100)::int)::text, 2, '0')
    ) AS gpu_pn,
    -- base GPU SN: 13-digit numeric string (1_000_000_000_000 .. 9_999_999_999_999)
    ( (floor(random() * 9000000000000)::bigint + 1000000000000)::text ) AS base_gpu_sn,
    -- create_date at midday for the day
    ( (current_date - (d.day_offset || ' days')::interval) + time '12:00:00' )::timestamptz AS created_at
  FROM fixtures_and_stations fs
  CROSS JOIN days d
)

-- 4) single INSERT that creates both LA and RA rows by joining fixture_parts for each fixture
INSERT INTO usage (
  id,
  fixture_part_id,
  test_slot,
  test_station,
  test_type,
  gpu_pn,
  gpu_sn,
  log_path,
  creator,
  create_date
)
SELECT
  gen_random_uuid() AS id,
  fp.id AS fixture_part_id,
  CASE WHEN fp.tester_type = 'LA Slot' THEN 'LA' ELSE 'RA' END AS test_slot,
  pn.station AS test_station,
  'Refurbish' AS test_type,
  pn.gpu_pn AS gpu_pn,
  CASE
    WHEN fp.tester_type = 'LA Slot' THEN pn.base_gpu_sn
    ELSE lpad( ((pn.base_gpu_sn::bigint + 1)::bigint)::text, 13, '0')
  END AS gpu_sn,
  ('mnt/nv/server_logs/' || pn.fixture_name || '-' || (CASE WHEN fp.tester_type = 'LA Slot' THEN 'LA' ELSE 'RA' END)) AS log_path,
  'admin' AS creator,
  pn.created_at AS create_date
FROM pn_sn pn
JOIN fixtures f ON f.fixture_name = pn.fixture_name
JOIN fixture_parts fp ON fp.parent_fixture_id = f.id AND fp.tester_type IN ('LA Slot', 'RA Slot')
ORDER BY pn.fixture_name, pn.day_offset, fp.tester_type;

COMMIT;
