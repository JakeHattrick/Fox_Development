import React, { useState } from 'react';
import { Box, Typography, Paper, Fade } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Header } from '../pagecomp/Header';
import { useTheme } from '@mui/material/styles';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend
);

const A2 = {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308, 11: 0.285, 12: 0.266};
const D3 = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184,
  10: 0.223, 11: 0.256, 12: 0.283};
const D4 = {2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114,6:2.004,7:1.924,
  8:1.864,9:1.816,10:1.777,11:1.744,12:1.717};

const XbarRChart = ({  data = [], title = "X bar R-Chart", subtitle = "",
  errorCode = "", isX = true, subSize = 6, minSamples = 5
}) => {
    const [selectedPoint, setSelectedPoint] = useState(null);
    const theme = useTheme();
    // Early return for no data
    if (!data || data.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Header
                title={`No data available for EC${errorCode}`}
                subTitle="Select different error code or date to view X bar R-Chart data"
                titleVariant="h6"
                subTitleVariant="body2"
                titleColor="text.secondary"
                />
            </Box>
        );
    } else if(data.length < (subSize * minSamples)){
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Header
                title={`Not sufficient data available for EC${errorCode}`}
                subTitle="Select different error code or increase date range to view X bar R-Chart data"
                titleVariant="h6"
                subTitleVariant="body2"
                titleColor="text.secondary"
                />
            </Box>
        );
    }

    const calculateChartStats = (data) => {
        const subgroups = [];
        const trimmedLength = data.length - (data.length % subSize);
        for (let i = 0; i < trimmedLength; i += subSize) {
            const subgroup = data.slice(i, i + subSize);
            const xi = subgroup.reduce((sum, item) => sum + item.value, 0) / subSize;
            const ri = Math.max(...subgroup.map(item => item.value)) - Math.min(...subgroup.map(item => item.value));
            const firstDate = subgroup[0].date;
            const lastDate = subgroup[subSize-1].date;
            subgroups.push({ xi, ri, firstDate, lastDate, subgroup });
        }

        const clr = subgroups.reduce((sum, sg) => sum + sg.ri, 0) / subgroups.length;
        const uclr = D4[subSize] * clr;
        const lclr = D3[subSize] * clr;
        const xbar = subgroups.reduce((sum, sg) => sum + sg.xi, 0) / subgroups.length;
        const uclx = xbar + (A2[subSize] * clr);
        const lclx = xbar - (A2[subSize] * clr);
        
        return {
            subgroups, clr, uclr, lclr, xbar, uclx, lclx
        };
    };

    const stats = calculateChartStats(data);

     // Process daily points
    const processedData = stats.subgroups.map(point => {        
        return {
            startDate: point.firstDate,
            endDate: point.lastDate,
            xi: point.xi,
            ri: point.ri,
            isOutOfControlX: point.xi > stats.uclx || point.xi < stats.lclx,
            isOutOfControlR: point.ri > stats.uclr || point.ri < stats.lclr,
            sampleSize: point.subgroup.length,
            sampleData: point.subgroup
        };
    });

    // Check for runs (7+ points above/below centerline)
    let runCountX = 0;
    let lastPositionX = null;
    let runCountR = 0;
    let lastPositionR = null;
    processedData.forEach((point, index) => {
        const currentPositionX = point.xi > stats.xbar;
        if (lastPositionX === currentPositionX) {
            runCountX++;
            if (runCountX >= 7) {
                // Mark points in the run as out of control
                for (let i = index - 6; i <= index; i++) {
                processedData[i].isOutOfControlX = true;
                }
            }
        } else {
            runCountX = 1;
        }
        lastPositionX = currentPositionX;

        const currentPositionR = point.ri > stats.clr;
        if (lastPositionR === currentPositionR) {
            runCountR++;
            if (runCountR >= 7) {
                // Mark points in the run as out of control
                for (let i = index - 6; i <= index; i++) {
                processedData[i].isOutOfControlR = true;
                }
            }
        } else {
            runCountR = 1;
        }
        lastPositionR = currentPositionR;
    });

    const labels = processedData.map(point => {
        const date = new Date(point.startDate);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        });
    });

    const chartData = {
        labels: labels,
        datasets: [
            { label: isX ? 'X - Bar' : 'R - Range',
                data: processedData.map(point => (isX ? point.xi : point.ri)),
                borderColor: '#1976d2',
                backgroundColor: processedData.map(point => 
                (isX ? point.isOutOfControlX : point.isOutOfControlR) ? '#d32f2f' : '#1976d2'
                ),
                pointRadius: 6,
                pointBorderWidth: 2,
                fill: false,
                tension: 0,
                showLine: true,
            },
            { label: 'UCL',
                data: Array(labels.length).fill((isX ? stats.uclx : stats.uclr)),
                borderColor: '#ff9800',
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false,
            },
            { label: isX ? 'X Bar (x̄)' : 'Center Line (R̄)',
                data: Array(labels.length).fill((isX ? stats.xbar : stats.clr)),
                borderColor: '#4caf50',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
            },
            { label: 'LCL',
                data: Array(labels.length).fill((isX ? stats.lclx : stats.lclr)),
                borderColor: '#ff9800',
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                color: theme.palette.text.secondary,
                usePointStyle: true,
                padding: 20
                },
                color: theme.palette.text.secondary,
            },
            title: {
                display: false
            },
            tooltip: {
                enabled: false // Disable hover tooltips, we'll use click instead
            }
        },
        scales: {
            x: {
                title: {
                display: true,
                text: 'Start of Subgroup',
                color: theme.palette.text.primary
                },
                grid: {
                display: true,
                color: '#f0f0f0'
                },
                ticks: {
                color: theme.palette.text.secondary,
                }
            },
            y: {
                title: {
                display: true,
                text: `Error ${isX ? 'Rate' : 'Range'} (%)`,
                color: theme.palette.text.primary
                },
                beginAtZero: true,
                max: Math.max(isX ? stats.uclx : stats.uclr, ...processedData.map(p => (isX ? p.xi : p.ri))) * 1.1,
                grid: {
                display: true,
                color: '#f0f0f0'
                },
                ticks: {
                color: theme.palette.text.secondary,
                callback: function(value) {
                    return value.toFixed(1) + '%';
                },
                }
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const dataIndex = elements[0].index;
                const point = processedData[dataIndex];
                
                setSelectedPoint({
                    startDate: point.startDate,
                    endDate: point.endDate,
                    value: isX ? point.xi : point.ri,
                    sampleSize: point.sampleSize,
                    sampleData: point.sampleData,
                    isOutOfControl: isX ? point.isOutOfControlX : point.isOutOfControlR,
                    ucl: isX ? stats.uclx : stats.uclr,
                    lcl: isX ? stats.lclx : stats.lclr
                });
            } else {
                setSelectedPoint(null);
            }
        },
            interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    const outOfControlCount = processedData.filter(p => isX ? p.isOutOfControlX : p.isOutOfControlR).length;
  
    const selectedPointRows = selectedPoint ? [
        { 
            label: isX ? 'x̄ (X Bar)' : 'R (Range)', 
            value: `${(selectedPoint.value).toFixed(2)}%` },
        { label: 'Sample Size',      value: `${selectedPoint?.sampleSize} parts`       },
        //{ label: 'Sample Values',          value: selectedPoint?.sampleData                   },
        { label: 'UCL',              value: `${(selectedPoint?.ucl).toFixed(2)}%` },
        { label: 'LCL',              value: `${(selectedPoint?.lcl).toFixed(2)}%` },
        {
            label: 'Status',
            value: selectedPoint?.isOutOfControl ? 'OUT OF CONTROL' : 'In Control',
            sx: {
                color: selectedPoint?.isOutOfControl ? 'error.main' : 'success.main',
                fontWeight: 'bold'
            }
        }
    ]:[];

    return (
        <Box>        
            <Box 
                sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: 2, 
                p: 2, 
                bgcolor: 'background.paper',
                borderRadius: 1
            }}>
                <Typography variant="body2">
                    <strong>{`Average ${isX ? 'X Bar':'R Range'}:`}</strong> { ((isX ? stats.xbar : stats.clr)).toFixed(2)}%
                </Typography>
                <Typography variant="body2">
                    <strong>Out of Control Points:</strong> {outOfControlCount}/{processedData.length}
                </Typography>
            </Box>
        
            <Header
                title={title}
                subTitle={subtitle}
                titleVariant="h6"
                subTitleVariant="body2"
            />
            
            <Box sx={{ height: 400, mt: 2 }}>
                <Line data={chartData} options={options} />
            </Box>
        
            {/* Click-to-view Point Details */}
            {selectedPoint && (
                <Fade in={true}>
                    <Paper sx={{ mt: 2, p: 2, bgcolor: selectedPoint.isOutOfControl ? 'error.light' : 'info.light', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Point Details: {new Date(selectedPoint.startDate).toLocaleDateString()} - {new Date(selectedPoint.endDate).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {selectedPointRows.map(({ label, value, sx }) => (
                                <Typography variant="body2" key={label} sx={sx}>
                                <strong>{label}:</strong> {value}
                                </Typography>
                            ))}
                        </Box>
                    </Paper>
                </Fade>
            )}
        
            <Box sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    <strong>{isX ? 'X Bar' : 'R Range'} Statistics:</strong> {processedData.length} data points • 
                    Control limits based on overall proportion • 
                    Red points indicate out-of-control conditions • 
                    3-sigma control limits (99.7% confidence)
                </Typography>
            </Box>
        </Box>
    );
};

export default XbarRChart;