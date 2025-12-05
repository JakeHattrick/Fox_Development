import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled,
  ListItemButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GridViewIcon from '@mui/icons-material/GridView';
import TableChartIcon from '@mui/icons-material/TableChart';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GradingIcon from '@mui/icons-material/Grading';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ThemeToggle } from '../theme/ThemeToggle';

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  marginTop: '40px',
}));

const MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, route: '/' },
  { text: 'Station Performance Charts', icon: <TableChartIcon/>, route: '/station-performance'},
  { text: 'Packing', icon: <Inventory2Icon />, route: '/packing' },
  { text: 'Pareto', icon: <TrendingUpIcon />, route: '/pareto' },

  { text: 'Fixture Management', icon: <Inventory2Icon />, children:[
    { text: 'Fixture Dashboard', icon: <GridViewIcon />, route: '/fixture-dash' },
    { text: 'Fixture Details', icon: <TableChartIcon />, route: '/fixture-details' },
    { text: 'Fixture Inventory', icon: <TableChartIcon />, route: '/fixture-inventory' },
  ]},

  // Test Engineers section
  { text: 'Test Engineers', icon: <AssessmentIcon />, children: [
    { text: 'Inventory', icon: <GridViewIcon />, route: '/fixtures' },
    { text: 'Fixture Maintenance', icon: <GridViewIcon />, route: '/fixture-maintenance' },
    { text: 'Health', icon: <GridViewIcon />, route: '/health' } ,
  ]},

  { text: 'Station Reports', icon: <GradingIcon />, children:[
    { text: 'SnFn Reports', icon: <GridViewIcon />, route: '/snfn' },
    { text: 'Station Hourly Summary', icon: <TableChartIcon />, route: '/station-hourly-summary' },
  ]},

  { text: 'Performance', icon: <SpeedIcon />, children:[
    { text: 'Quality Control Charts', icon: <SpeedIcon />, route: '/performance' },
    { text: 'Throughput', icon: <TrendingUpIcon />, route: '/throughput' }
  ]},

  { text: 'Auxiliary Reports', icon: <SpeedIcon />, children:[
    { text: 'Station Cycle Time', icon: <AccessTimeIcon />, route: '/cycle-time' },
    { text: 'Most Recent Fail', icon: <AccessTimeIcon />, route: '/most-recent-fail' },
    { text: 'Get by Error', icon: <TableChartIcon />, route: '/by-error' },
    { text: 'Json to CSV', icon: <TableChartIcon />, route: '/json-to-csv' },
    { text: 'Did They Fail', icon: <TableChartIcon />, route: '/did-they-fail' },
  ]}
];

const DEV_MENU_ITEMS = [
  { text: 'File Upload', icon: <CloudUploadIcon />, route: '/dev/upload' }
];

const MenuItem = React.memo(function MenuItem({ item, onClose, nested = false }) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={item.route ? Link : 'div'}
        to={item.route}
        onClick={onClose}
        sx={ nested ? { pl: 4 } : undefined }
      >
        <ListItemIcon sx={{ color: 'white' }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
});

export const SideDrawer = React.memo(({ open, onClose }) => {
  const [stationReportsOpen, setStationReportsOpen] = useState(false);
  const [performanceReportsOpen, setPerformanceReportsOpen] = useState(false);
  const [auxiliaryReportsOpen, setAuxiliaryReportsOpen] = useState(false);
  const [fixtureManagementOpen, setFixtureManagementOpen] = useState(false);
  const [testEngineersOpen, setTestEngineersOpen] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if ((navigator.deviceMemory && navigator.deviceMemory < 4)
      || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
      || isMobile
    ) {
      setIsLowEndDevice(true);
    }
  }, [isMobile]);

  const drawerStyle = useMemo(() => ({
    width: 240,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: 240,
      boxSizing: 'border-box',
      backgroundColor: '#1e3a5f',
      color: 'white',
      borderRight: 'none',
    },
  }), []);

  const transitionDuration = useMemo(() => (
    isLowEndDevice ? { enter: 0, exit: 0 } : { enter: 225, exit: 175 }
  ), [isLowEndDevice]);

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      keepMounted={false}
      disableScrollLock
      transitionDuration={transitionDuration}
      BackdropProps={{
        invisible: isLowEndDevice,
      }}
      ModalProps={{
        keepMounted: false,
        disableScrollLock: true,
        disablePortal: true,
        BackdropProps: {
          transitionDuration: isLowEndDevice ? 0 : 225
        }
      }}
      sx={drawerStyle}
      SlideProps={{
        style: {
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }
      }}
    >
      <DrawerHeader>
        <Typography variant="h6" component="div">
          Menu
        </Typography>
        <ThemeToggle />
      </DrawerHeader>

      <List>
        {MENU_ITEMS.map(item => {
          if (item.children) {
            const isOpen = item.text === 'Station Reports'
                            ? stationReportsOpen
                            : item.text === 'Performance'
                            ? performanceReportsOpen
                            : item.text === 'Auxiliary Reports'
                            ? auxiliaryReportsOpen
                            : item.text === 'Fixture Management'
                            ? fixtureManagementOpen
                            : item.text === 'Test Engineers'
                            ? testEngineersOpen
                            : false;

            const toggle  = item.text === 'Station Reports'
                            ? setStationReportsOpen
                            : item.text === 'Performance'
                            ? setPerformanceReportsOpen
                            : item.text === 'Auxiliary Reports'
                            ? setAuxiliaryReportsOpen
                            : item.text === 'Fixture Management'
                            ? setFixtureManagementOpen
                            : item.text === 'Test Engineers'
                            ? setTestEngineersOpen
                            : ()=>{};

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => toggle(open => !open)}>
                    <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    {isOpen ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                  </ListItemButton>
                </ListItem>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map(child => (
                      <MenuItem
                        key={child.text}
                        item={child}
                        onClose={onClose}
                        nested
                      />
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <MenuItem
              key={item.text}
              item={item}
              onClose={onClose}
            />
          );
        })}

        {process.env.NODE_ENV === 'development' && (
          <>
            <ListItem sx={{ borderTop: '1px solid rgba(255,255,255,0.12)', mt: 2, pt: 2 }}>
              <ListItemText
                primary="Development"
                primaryTypographyProps={{ variant: 'overline', sx: { opacity: 0.7 } }}
              />
            </ListItem>
            {DEV_MENU_ITEMS.map(item => (
              <MenuItem
                key={item.text}
                item={item}
                onClose={onClose}
              />
            ))}
          </>
        )}
      </List>
    </Drawer>
  );
});
