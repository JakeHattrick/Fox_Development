const express = require('express');
const router = express.Router();
const { pool } = require('../db.js');

router.get('/daily', async (req, res) => {
    try {
        const { startDate, endDate, model } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required query parameters: startDate, endDate' });
        }
        
        let query = `
            SELECT 
                date_id,
                model,
                workstation_name,
                total_parts,
                passed_parts,
                failed_parts,
                throughput_yield,
                week_id,
                week_start,
                week_end,
                total_starters
            FROM daily_tpy_metrics 
            WHERE date_id >= $1 AND date_id <= $2
        `;
        
        let params = [startDate, endDate];
        
        if (model) {
            query += ` AND model = $3`;
            params.push(model);
        }
        
        query += ` ORDER BY date_id DESC, model, workstation_name`;
        
        const result = await pool.query(query, params);
        
        const groupedData = {};
        result.rows.forEach(row => {
            const dateStr = row.date_id.toISOString().split('T')[0];
            if (!groupedData[dateStr]) {
                groupedData[dateStr] = {
                    date: dateStr,
                    weekId: row.week_id,
                    weekStart: row.week_start,
                    weekEnd: row.week_end,
                    totalStarters: row.total_starters,
                    stations: {}
                };
            }
            
            if (!groupedData[dateStr].stations[row.model]) {
                groupedData[dateStr].stations[row.model] = {};
            }
            
            groupedData[dateStr].stations[row.model][row.workstation_name] = {
                totalParts: row.total_parts,
                passedParts: row.passed_parts,
                failedParts: row.failed_parts,
                throughputYield: row.throughput_yield
            };
        });
        
        res.json(Object.values(groupedData));
    } catch (error) {
        console.error('Error fetching daily TPY metrics:', error);
        res.status(500).json({ error: error.message });
    }
});


router.get('/weekly', async (req, res) => {
    try {
        const { startWeek, endWeek } = req.query;
        
        if (!startWeek || !endWeek) {
            return res.status(400).json({ error: 'Missing required query parameters: startWeek, endWeek' });
        }

        // Get main weekly metrics
        const weeklyQuery = `
            SELECT 
                week_id,
                week_start,
                week_end,
                weekly_first_pass_yield_traditional_parts_started,
                weekly_first_pass_yield_traditional_first_pass_success,
                weekly_first_pass_yield_traditional_first_pass_yield,
                weekly_first_pass_yield_completed_only_active_parts,
                weekly_first_pass_yield_completed_only_first_pass_success,
                weekly_first_pass_yield_completed_only_first_pass_yield,
                weekly_first_pass_yield_breakdown_parts_completed,
                weekly_first_pass_yield_breakdown_parts_failed,
                weekly_first_pass_yield_breakdown_parts_stuck_in_limbo,
                weekly_first_pass_yield_breakdown_total_parts,
                weekly_overall_yield_total_parts,
                weekly_overall_yield_completed_parts,
                weekly_overall_yield_overall_yield,
                weekly_throughput_yield_station_metrics,
                weekly_throughput_yield_average_yield,
                total_stations,
                best_station_name,
                best_station_yield,
                worst_station_name,
                worst_station_yield,
                created_at
            FROM weekly_tpy_metrics 
            WHERE week_id >= $1 AND week_id <= $2
            ORDER BY week_id DESC
        `;
        
        // Get model-specific metrics
        const modelQuery = `
            SELECT 
                week_id,
                model,
                hardcoded_stations,
                hardcoded_tpy,
                dynamic_stations,
                dynamic_tpy,
                dynamic_station_count
            FROM weekly_tpy_model_metrics
            WHERE week_id >= $1 AND week_id <= $2
        `;

        const [weeklyResult, modelResult] = await Promise.all([
            pool.query(weeklyQuery, [startWeek, endWeek]),
            pool.query(modelQuery, [startWeek, endWeek])
        ]);

        // Group model metrics by week
        const modelMetricsByWeek = modelResult.rows.reduce((acc, row) => {
            if (!acc[row.week_id]) {
                acc[row.week_id] = {};
            }
            
            // Convert model name to expected format (e.g., 'Tesla SXM4' -> 'SXM4')
            const modelKey = row.model.replace('Tesla ', '');
            
            acc[row.week_id][modelKey] = {
                hardcodedTPY: row.hardcoded_tpy,
                dynamicTPY: row.dynamic_tpy,
                hardcodedStations: JSON.parse(row.hardcoded_stations),
                dynamicStations: JSON.parse(row.dynamic_stations),
                stationCount: row.dynamic_station_count
            };
            
            return acc;
        }, {});

        const transformedData = weeklyResult.rows.map(row => {
            const weekModels = modelMetricsByWeek[row.week_id] || {};
            
            return {
                weekId: row.week_id,
                weekStart: row.week_start,
                weekEnd: row.week_end,
                traditionalFPY: row.weekly_first_pass_yield_traditional_first_pass_yield,
                completedOnlyFPY: row.weekly_first_pass_yield_completed_only_first_pass_yield,
                // Map model-specific TPY values
                sxm4HardcodedTPY: weekModels.SXM4?.hardcodedTPY || null,
                sxm4DynamicTPY: weekModels.SXM4?.dynamicTPY || null,
                sxm5HardcodedTPY: weekModels.SXM5?.hardcodedTPY || null,
                sxm5DynamicTPY: weekModels.SXM5?.dynamicTPY || null,
                sxm6HardcodedTPY: weekModels.SXM6?.hardcodedTPY || null,
                sxm6DynamicTPY: weekModels.SXM6?.dynamicTPY || null,
                breakdown: {
                    partsCompleted: row.weekly_first_pass_yield_breakdown_parts_completed,
                    partsFailed: row.weekly_first_pass_yield_breakdown_parts_failed,
                    partsStuckInLimbo: row.weekly_first_pass_yield_breakdown_parts_stuck_in_limbo,
                    totalParts: row.weekly_first_pass_yield_breakdown_total_parts
                },
                summary: {
                    totalStations: row.total_stations,
                    bestStation: row.best_station_name,
                    bestStationYield: row.best_station_yield,
                    worstStation: row.worst_station_name,
                    worstStationYield: row.worst_station_yield
                },
                createdAt: row.created_at,
                // Add station metrics from the weekly_throughput_yield_station_metrics JSON field
                stationMetrics: row.weekly_throughput_yield_station_metrics
            };
        });
        
        res.json(transformedData);
    } catch (error) {
        console.error('Error fetching weekly TPY metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const dailyQuery = `
            SELECT 
                COUNT(*) as total_records,
                MAX(date_id) as latest_date,
                COUNT(DISTINCT model) as models_count,
                COUNT(DISTINCT workstation_name) as stations_count
            FROM daily_tpy_metrics
        `;
        
        const weeklyQuery = `
            SELECT 
                COUNT(*) as total_records,
                MAX(week_id) as latest_week
            FROM weekly_tpy_metrics
        `;
        
        const modelQuery = `
            SELECT 
                model,
                AVG(hardcoded_tpy) as avg_hardcoded_tpy,
                AVG(dynamic_tpy) as avg_dynamic_tpy,
                COUNT(DISTINCT week_id) as weeks_count
            FROM weekly_tpy_model_metrics
            GROUP BY model
        `;
        
        const recentQuery = `
            SELECT 
                date_id,
                model,
                AVG(throughput_yield) as avg_yield
            FROM daily_tpy_metrics 
            WHERE date_id >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY date_id, model
            ORDER BY date_id DESC
            LIMIT 10
        `;
        
        const [dailyResult, weeklyResult, modelResult, recentResult] = await Promise.all([
            pool.query(dailyQuery),
            pool.query(weeklyQuery),
            pool.query(modelQuery),
            pool.query(recentQuery)
        ]);
        
        const dailySummary = dailyResult.rows[0];
        const weeklySummary = weeklyResult.rows[0];
        
        // Process model averages
        const modelAverages = modelResult.rows.reduce((acc, row) => {
            const modelKey = row.model.replace('Tesla ', '');
            acc[modelKey] = {
                avgHardcodedTPY: parseFloat(row.avg_hardcoded_tpy || 0),
                avgDynamicTPY: parseFloat(row.avg_dynamic_tpy || 0),
                weeksCount: parseInt(row.weeks_count)
            };
            return acc;
        }, {});
        
        res.json({
            daily: {
                totalRecords: parseInt(dailySummary.total_records),
                latestDate: dailySummary.latest_date,
                modelsCount: parseInt(dailySummary.models_count),
                stationsCount: parseInt(dailySummary.stations_count)
            },
            weekly: {
                totalRecords: parseInt(weeklySummary.total_records),
                latestWeek: weeklySummary.latest_week,
                modelAverages: modelAverages
            },
            recent: recentResult.rows.map(row => ({
                date: row.date_id,
                model: row.model,
                avgYield: parseFloat(row.avg_yield || 0)
            }))
        });
    } catch (error) {
        console.error('Error fetching TPY summary:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/station-performance', async (req, res) => {
    try {
        const { date, model, weekId } = req.query;
        
        if (!date && !weekId) {
            return res.status(400).json({ error: 'Either date or weekId parameter is required' });
        }
        
        if (weekId) {
            // If weekId is provided, get data from weekly_tpy_model_metrics
            let query = `
                SELECT 
                    model,
                    hardcoded_stations,
                    dynamic_stations,
                    hardcoded_tpy,
                    dynamic_tpy,
                    dynamic_station_count
                FROM weekly_tpy_model_metrics 
                WHERE week_id = $1
            `;
            
            let params = [weekId];
            
            if (model) {
                query += ` AND model = $2`;
                params.push(model);
            }
            
            const result = await pool.query(query, params);
            
            // Transform the results to match the expected format
            const transformedData = result.rows.map(row => {
                const hardcodedStations = JSON.parse(row.hardcoded_stations || '{}');
                const dynamicStations = JSON.parse(row.dynamic_stations || '{}');
                
                return {
                    model: row.model,
                    hardcodedTPY: row.hardcoded_tpy,
                    dynamicTPY: row.dynamic_tpy,
                    stationCount: row.dynamic_station_count,
                    stations: {
                        hardcoded: Object.entries(hardcodedStations).map(([name, yield]) => ({
                            name,
                            yield
                        })),
                        dynamic: Object.entries(dynamicStations).map(([name, data]) => ({
                            name,
                            ...data
                        }))
                    }
                };
            });
            
            res.json(transformedData);
        } else {
            // If date is provided, get data from daily_tpy_metrics
            let query = `
                SELECT 
                    model,
                    workstation_name,
                    total_parts,
                    passed_parts,
                    failed_parts,
                    throughput_yield
                FROM daily_tpy_metrics 
                WHERE date_id = $1
            `;
            
            let params = [date];
            
            if (model) {
                query += ` AND model = $2`;
                params.push(model);
            }
            
            query += ` ORDER BY model, throughput_yield DESC`;
            
            const result = await pool.query(query, params);
            
            // Group results by model
            const groupedData = result.rows.reduce((acc, row) => {
                if (!acc[row.model]) {
                    acc[row.model] = [];
                }
                
                acc[row.model].push({
                    name: row.workstation_name,
                    totalParts: row.total_parts,
                    passedParts: row.passed_parts,
                    failedParts: row.failed_parts,
                    yield: row.throughput_yield
                });
                
                return acc;
            }, {});
            
            const transformedData = Object.entries(groupedData).map(([model, stations]) => ({
                model,
                stations: {
                    daily: stations
                }
            }));
            
            res.json(transformedData);
        }
    } catch (error) {
        console.error('Error fetching station performance:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/test-yields', async (req, res) => {
  try {
    let { dates } = req.body;

    // Normalize inputs to arrays
    if (typeof dates === 'string') dates = dates.split(',').map(s => s.trim()).filter(Boolean);

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Missing required query parameters: dates' });
    }

    const query = `
      WITH pivot AS (
        SELECT
          model,
          SUM(total_parts) FILTER (WHERE workstation_name = 'ASSY2') AS assy2_total,
          SUM(total_parts) FILTER (WHERE workstation_name = 'FLA')   AS fla_total,
          SUM(total_parts) FILTER (WHERE workstation_name = 'FCT')   AS fct_total
        FROM daily_tpy_metrics
        WHERE date_id = ANY($1::date[])
        GROUP BY model
      )
      SELECT
        model,
        COALESCE(assy2_total, 0) AS assy2_total,
        COALESCE(fla_total, 0)   AS fla_total,
        COALESCE(fct_total, 0)   AS fct_total,
        ROUND((COALESCE(assy2_total,0)::numeric / NULLIF(fla_total, 0)) * 100, 2) AS test_yield_fla,
        ROUND((COALESCE(assy2_total,0)::numeric / NULLIF(fct_total, 0)) * 100, 2) AS test_yield_fct
      FROM pivot
      ORDER BY model;
    `;

    const params = [dates];
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('by-error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router; 