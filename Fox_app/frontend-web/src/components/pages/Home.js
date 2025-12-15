// React Core
import React from 'react';
// Material UI Components
import { Box, Card, CardActionArea, Grid, Typography, Button } from '@mui/material';
// Third Party Libraries
import 'react-datepicker/dist/react-datepicker.css';

// Page Components
import { Header } from '../pagecomp/Header.jsx';
import { useNavigate } from 'react-router-dom';
import { useGlobalSettings } from '../../data/GlobalSettingsContext.js';
import{
  Assessment as QualityIcon, 
  MonitorHeart as TestEngineerIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { cardStyle, cardActionStyle } from '../theme/themes.js';

export const Home = () => {
    const theme = useTheme();
    const { state, dispatch } = useGlobalSettings();
    const { currentMode } = state;
    const navigate = useNavigate();

    const handleButtonClick = (mode) => {
        dispatch({ type: 'SET_MODE', mode });
        navigate('/dashboard');
    }

    return (
        <Box>
            <Header title="Foxconn Home" subTitle={`Select Dashboard Mode. Current Mode: ${currentMode}`} />
            <Grid container spacing={3} justifyContent="center">
                <Grid>
                    <Card sx={cardStyle} onClick={() => handleButtonClick('Quality')}>
                    <CardActionArea sx={cardActionStyle}>
                        <QualityIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
                        <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                            Quality Portal
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            KPI Reports & Analytics
                        </Typography>
                    </CardActionArea>
                    </Card>
                </Grid>

                <Grid >
                    <Card sx={cardStyle} onClick={()=>handleButtonClick('TE')}>
                    <CardActionArea sx={cardActionStyle}>
                        <TestEngineerIcon sx={{ fontSize: 80, color: theme.palette.success.main, mb: 2 }} />
                        <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                            Test Engineer Portal
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Real-time Equipment Monitoring
                        </Typography>
                    </CardActionArea>
                    </Card>
                </Grid>
                {process.env.NODE_ENV === 'development' && (
                    <Button variant="outlined" onClick={() => handleButtonClick('Dev')}>
                        Developer Dashboard
                    </Button>
                )}  
            </Grid> 
        </Box>
    );
};

export default Home;