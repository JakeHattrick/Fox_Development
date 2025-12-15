import React, { useMemo } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';

const MenuIconElement = <MenuIcon />;

const AppTitle = React.memo(() => {

  const navigate = useNavigate();
  const version = process.env.APP_VERSION || '0.0.0';

  const handleTitleClick = () =>{
    navigate('/');
  }

  return(
  <Typography variant="h6" noWrap component="div" onClick={handleTitleClick}
    sx={{cursor:'pointer', '&:hover':{opacity:0.8}}}
  >
    Fox App
    <Typography component="sub" variant="caption" sx={{ marginLeft: 0.5 }}>
      Web v{version}
    </Typography>
  </Typography>
  );
});

const MenuButton = React.memo(({ onClick, style }) => (
  <IconButton
    color="inherit"
    aria-label="open drawer"
    edge="start"
    onClick={onClick}
    sx={style}
  >
    {MenuIconElement}
  </IconButton>
));

export const AppHeader = React.memo(({ onMenuClick }) => {
  const appBarStyle = useMemo(() => ({
    zIndex: (theme) => theme.zIndex.drawer + 1,
    backgroundColor: '#1e3a5f',
    boxShadow: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
  }), []);

  const toolbarStyle = useMemo(() => ({
    userSelect: 'none',
  }), []);

  const menuButtonStyle = useMemo(() => ({
    mr: 2
  }), []);

  return (
    <AppBar
      position="fixed"
      sx={appBarStyle}
    >
      <Toolbar
        variant="dense"
        sx={toolbarStyle}
      >
        <MenuButton onClick={onMenuClick} style={menuButtonStyle} />
        <AppTitle />
      </Toolbar>
    </AppBar>
  );
}, (prevProps, nextProps) => {
  return prevProps.onMenuClick === nextProps.onMenuClick;
}); 