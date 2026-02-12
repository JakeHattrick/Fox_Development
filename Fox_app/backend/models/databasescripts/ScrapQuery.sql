--- G5 FLA with 24 hour gap

WITH weekly_fixture_runtime AS (
    SELECT
        date_trunc('week', history_station_start_time)::date AS week_start,
        fixture_no,
        SUM(
            EXTRACT(EPOCH FROM (history_station_end_time - history_station_start_time))
        ) AS total_run_seconds
    FROM testboard_master_log
    WHERE fixture_no IN (
        -- your full Gen5 list here
        'NCT032-01','NCT032-02','NCT032-03','NCT032-04',
        'NCT031-01','NCT031-02','NCT031-03','NCT031-04',
        'NCT030-01','NCT030-02','NCT030-03','NCT030-04',
        'NCT029-01','NCT029-03','NCT029-04',
        'NCT015-01','NCT015-02','NCT015-03','NCT015-04',
        'NCT014-01','NCT014-02','NCT014-03','NCT014-04',
        'NCT013-01','NCT013-02','NCT013-03','NCT013-04',
        'NCT012-01','NCT012-02','NCT012-03','NCT012-04',
        'NCT011-01','NCT011-02','NCT011-04',
        'NCT020-01','NCT020-02','NCT020-03','NCT020-04',
        'NCT025-01','NCT025-02','NCT025-03','NCT025-04',
        'NCT02Y-01',
        'NCT026-02','NCT026-03','NCT026-04',
        'NCT027-01','NCT027-02','NCT027-03','NCT027-04',
        'NCT028-01','NCT028-02','NCT028-03','NCT028-04',
        'NCT024-01','NCT024-02','NCT024-04',
        'NCT023-01','NCT023-02','NCT023-03','NCT023-04',
        'NCT022-01','NCT022-02','NCT022-03','NCT022-04',
        'NCT021-01','NCT021-02','NCT021-03','NCT021-04',
        'NCB044-01','NCB044-02','NCB044-03'
    )
    AND workstation_name ILIKE ANY (

		--- FLA :Flashing tests
        ---ARRAY['%FLA%', '%CHIFLASH%']

		--- Cluster Test
		ARRAY['%BAT%', '%BIT%', '%PHT%', '%FCT%', '%PDT%', '%FPF%', '%IST%', '%EFT%', '%TCP%']
		
    )
    GROUP BY week_start, fixture_no
)

SELECT
    week_start,
    COUNT(DISTINCT fixture_no) AS testers_used,

    ROUND(
        AVG(
            LEAST(

				--- Full Week Without 24 hour gap
				 (total_run_seconds / (7*24*60*60)) * 100,
			
                -- Production Hour logic
                --(total_run_seconds / ((7*24*60*60) - (24*60*60))) * 100,
                100
            )
        ), 2
    ) AS avg_usage_percent

FROM weekly_fixture_runtime
GROUP BY week_start
ORDER BY week_start DESC;