import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {  Drawer, List, ListItem, ListItemIcon, ListItemText, styled, ListItemButton, Box, 
  Typography, useTheme, useMediaQuery, Collapse, 
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
import { GlobalSettingsContext, useGlobalSettings } from '../../data/GlobalSettingsContext';


const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  marginTop: '40px',
}));

const DASHBOARD_MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, route: '/dashboard' }
];

const MENU_ITEMS_QUALITY = [
  { text: 'Station Performance Charts', icon: <TableChartIcon/>, route: '/station-performance'},
  { text: 'Packing', icon: <Inventory2Icon />, route: '/packing' },
  { text: 'Pareto', icon: <TrendingUpIcon />, route: '/pareto' },
  { text: 'Query Page', icon: <Inventory2Icon />, route: 'query-page'},
  { text: 'Station Reports', icon: <GradingIcon />, children:[
    { text: 'SnFn Reports', icon: <GridViewIcon />, route: '/snfn' },
    { text: 'Station Hourly Summary', icon: <TableChartIcon />, route: '/station-hourly-summary' },
  ]},
  { text: 'Performance', icon: <SpeedIcon />, children:[
    { text: 'Quality Control Charts', icon: <SpeedIcon />, route: '/performance' },
    { text: 'Throughput', icon: <TrendingUpIcon />, route: '/throughput' },
    { text: 'Xbar-R Chart', icon: <SpeedIcon />, route: '/xbar-r-chart' },
  ]},
  { text: 'Utility Reports', icon: <SpeedIcon />, children:[
    { text: 'Most Recent Fail', icon: <AccessTimeIcon />, route: '/most-recent-fail'}
  ]},
];

const MENU_ITEMS_TE = [
  { text: 'Fixture Management', icon: <Inventory2Icon />, children:[
    { text: 'Fixture Dashboard', icon: <GridViewIcon />, route: '/fixture-dash' },
    { text: 'Fixture Details', icon: <TableChartIcon />, route: '/fixture-details' },
    { text: 'Fixture Inventory', icon: <TableChartIcon />, route: '/fixture-inventory' },
  ]},
  { text: 'Test Engineers', icon: <AssessmentIcon />, children: [
    { text: 'Inventory', icon: <GridViewIcon />, route: '/fixtures' },
    { text: 'Fixture Maintenance', icon: <GridViewIcon />, route: '/fixture-maintenance' },
    { text: 'Health', icon: <GridViewIcon />, route: '/health' } ,
    { text: 'Usage', icon: <GridViewIcon />, route: '/usage' } ,
    { text: 'Test Board', icon: <GridViewIcon />, route: '/testboard' } ,
  ]}

];

const DEV_MENU_ITEMS = [
  { text: 'File Upload', icon: <CloudUploadIcon />, route: '/dev/upload' },
  { text: 'Auxiliary Reports', icon: <SpeedIcon />, children:[
    { text: 'Station Cycle Time', icon: <AccessTimeIcon />, route: '/cycle-time' },
    //{ text: 'Most Recent Fail', icon: <AccessTimeIcon />, route: '/most-recent-fail' },
    { text: 'Get by Error', icon: <TableChartIcon />, route: '/by-error' },
    { text: 'Json to CSV', icon: <TableChartIcon />, route: '/json-to-csv' },
    { text: 'Did They Fail', icon: <TableChartIcon />, route: '/did-they-fail' },
  ]
  }
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
  
  const { state, dispatch } = useGlobalSettings();
  const { currentMode } = state;

  const [openState, setOpenState] = useState({
    "Station Reports": false,
    "Performance": false,
    "Auxiliary Reports": false,
    "Fixture Management": false,
    "Testing Dashboard": false, 
  });
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
        {DASHBOARD_MENU_ITEMS.map(item => (
          <MenuItem
            key={item.text}
            item={item}
            onClose={onClose}
          />
        ))}
        {(currentMode === "Quality" || currentMode === "Dev") && MENU_ITEMS_QUALITY.map(item => {
          // If it has children, render collapse
          if (item.children) {
            const isOpen = openState[item.text];
            const toggle  = () => {
              setOpenState(prev => ({
                ...prev,
                [item.text]: !prev[item.text]
              }));
            }
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

          // Otherwise a normal menu item
          return (
            <MenuItem
              key={item.text}
              item={item}
              onClose={onClose}
            />
          );
        })}

        {(currentMode === "TE" || currentMode === "Dev") && MENU_ITEMS_TE.map(item => {
          // If it has children, render collapse
          if (item.children) {
            const isOpen = openState[item.text];
            const toggle  = () => {
              setOpenState(prev => ({
                ...prev,
                [item.text]: !prev[item.text]
              }));
            }
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

          // Otherwise a normal menu item
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
            {DEV_MENU_ITEMS.map((item) => {
              // If it has children, render collapse
              if (item.children) {
                const isOpen = openState[item.text];
                const toggle  = () => {
                  setOpenState(prev => ({
                    ...prev,
                    [item.text]: !prev[item.text]
                  }));
                }
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

              // Otherwise a normal menu item
              return (
                <MenuItem
                  key={item.text}
                  item={item}
                  onClose={onClose}
                />
              );
            })}
          </>
        )}
      </List>
    </Drawer>
  );
});