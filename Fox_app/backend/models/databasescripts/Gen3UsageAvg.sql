WITH weekly_fixture_runtime AS (
    SELECT
        date_trunc('week', history_station_start_time)::date AS week_start,
        fixture_no,
 
        -- total runtime per fixture per week (seconds)
        SUM(
            EXTRACT(EPOCH FROM (history_station_end_time - history_station_start_time))
        ) AS run_seconds,
 
        -- counts
        SUM(CASE WHEN history_station_passing_status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN history_station_passing_status <> 'Pass' THEN 1 ELSE 0 END) AS fail_count,
        COUNT(*) AS total_tested
    FROM testboard_master_log
    WHERE fixture_no IN (
        'NCT005-01','NCT005-02','NCT005-03','NCT005-04',
        'NCT004-01','NCT004-02','NCT004-03','NCT004-04',
        'NCT003-01','NCT003-02','NCT003-03','NCT003-04',
        'NCT002-01','NCT002-02','NCT002-03','NCT002-04',
        'NCT001-01','NCT001-02',
        'NCT006-01','NCT006-02','NCT006-03','NCT006-04',
        'NCT007-01','NCT007-02','NCT007-03','NCT007-04',
        'NCT008-01','NCT008-02','NCT008-03','NCT008-04',
        'NCT009-01','NCT009-02','NCT009-03','NCT009-04',
        'NCT010-01','NCT010-02','NCT010-03','NCT010-04',
        'NCT019-01','NCT019-02','NCT019-03','NCT019-04',
        'NCT018-01','NCT018-02','NCT018-03','NCT018-04',
        'NCT017-01','NCT017-02','NCT017-03','NCT017-04',
        'NCT016-01','NCT016-02','NCT016-03','NCT016-04',
        'NCT033-01','NCT033-02','NCT033-03','NCT033-04',
        'NCB038-01','NCB038-02','NCB038-03','NCB038-04',
        'NCB036-01','NCB036-02','NCB036-03','NCB036-04',
        'NCB037-01','NCB037-02','NCB037-03','NCB037-04'
    )

    AND history_station_start_time >= date_trunc('week', current_date) - interval '4 weeks'
    AND history_station_start_time <  date_trunc('week', current_date)
    AND pn IS NOT NULL
    AND workstation_name ILIKE ANY (
        ARRAY['%BAT%', '%BIT%', '%FCT%', '%FPF%', '%OQA%']
    )
    GROUP BY week_start, fixture_no
),
 
weekly_summary AS (
    SELECT
        week_start,
 
        COUNT(DISTINCT fixture_no) AS gen5_testers_used,
 
        -- weekly usage %
        ROUND(
            AVG(
                LEAST(
                    (run_seconds / 604800) * 100,
                    100
                )
            ),
            2
        ) AS avg_usage_percent,
 
        SUM(total_tested) AS total_tested,
        SUM(pass_count) AS pass_count,
        SUM(fail_count) AS fail_count,
 
        ROUND(
            SUM(pass_count)::numeric / NULLIF(SUM(total_tested), 0) * 100,
            2
        ) AS yield_percent
    FROM weekly_fixture_runtime
    GROUP BY week_start
)
 
SELECT
    week_start,
    gen5_testers_used,
    avg_usage_percent,
    total_tested,
    pass_count,
    fail_count,
    yield_percent
FROM weekly_summary
ORDER BY week_start DESC;