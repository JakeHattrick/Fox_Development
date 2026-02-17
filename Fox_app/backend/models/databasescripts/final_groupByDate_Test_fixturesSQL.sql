/* 
-- there are overlaps in the durations. starts again before the last run ended so duration is doubled up and sometimes over 24hrs
select sum(history_station_end_time - history_station_start_time) as duration, fixture_no, date(history_station_start_time) as date
from testboard_master_log
group by date, fixture_no
order by date, fixture_no

-- checks for overlaps. If start2 < end1, then there are overlaps and "duration" is not accurate
select a.fixture_no,
	a.history_station_start_time as start1,
	a.history_station_end_time as end1,
	b.history_station_start_time as start2,
	b.history_station_end_time as end2
from testboard_master_log a
join testboard_master_log b on
		a.fixture_no = b.fixture_no
 	and a.history_station_start_time < b.history_station_end_time
 	and b.history_station_start_time < a.history_station_end_time
 	and a.ctid <> b.ctid
order by a.fixture_no, start1
*/
-- Above was for visualization and viewing table / testing
-- CTE's and select statement below
-- adds in the previous end time to check for overlaps. 
with fixed as (
	select fixture_no,
		date(history_station_start_time) as date, 
		history_station_start_time as start_time,
		history_station_end_time as end_time,
		lag(history_station_end_time) over (partition by fixture_no order by history_station_start_time) as prev_end
	from testboard_master_log
), 

calc_start as (
	select 
		date,
		fixture_no,
		start_time, 
		end_time, 
		case when prev_end is null or start_time > prev_end then start_time else least(prev_end, end_time)
			end as real_start
	from fixed
)

select 
	date,
	tester_type,
	round(avg(usage_percent), 2) as avg_usage_percent
from (
	select 
		date, 
		case 
			when (select split_part(fixture_no, '-', 1)) in ('NCT011', 'NCT012', 'NCT013', 'NCT014', 'NCT015', 'NCT020', 'NCT021', 'NCT022', 'NCT023', 'NCT024',
			                    'NCT025', 'NCT026', 'NCT027', 'NCT028', 'NCB029', 'NCB030', 'NCB031', 'NCB032', 'NCB044', 'NCB045', 'NCB046', 'NCB047', 'NCB048', 'NCB049') 
				then 'Gen5 Tester'
			else 'Gen3 Tester'
		end 
		as tester_type,
		fixture_no,
		case 
			when (sum(extract(epoch from (end_time - real_start))/ (24 * 60 * 60))) * 100 > 100 then 100
			else round(sum(extract(epoch from (end_time - real_start))/ (24 * 60 * 60)) * 100, 2)
		end 
		as usage_percent
	from calc_start
	where date >= '2025-12-03 00:00:00' and 
	      date < '2025-12-04 00:00:00'
	group by date, fixture_no
	order by date, fixture_no
)
where tester_type = 'Gen5 Tester'
group by date, tester_type
