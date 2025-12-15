import { createTheme, useTheme } from '@mui/material/styles';

const sidebarColor = '#1e3a5f';  // Dark blue for sidebar in both themes

// Define theme colors
const themeColors = {
    light: {
        primaryMain: '#1976d2',
        primaryDark: sidebarColor,
        backgroundDefault: '#f5f7fa',
        backgroundPaper: '#ffffff',
        textPrimary: '#000000',
        textSecondary: '#757575',
        divider: 'rgba(0, 0, 0, 0.12)'
    },
    dark: {
        primaryMain: '#90caf9',
        primaryDark: sidebarColor,
        backgroundDefault: '#2c3e50',
        backgroundPaper: '#34495e',
        textPrimary: '#ffffff',
        textSecondary: '#b0bec5',
        divider: 'rgba(255, 255, 255, 0.12)'
    }
};

// Function to apply theme colors as CSS variables
export const applyThemeColors = (isDarkMode) => {
    const colors = isDarkMode ? themeColors.dark : themeColors.light;
    const root = document.documentElement;
    
    // Set CSS variables
    root.style.setProperty('--primary-main', colors.primaryMain);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--background-default', colors.backgroundDefault);
    root.style.setProperty('--background-paper', colors.backgroundPaper);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--divider', colors.divider);
};

// Create MUI themes that reference the CSS variables
export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: themeColors.light.primaryMain,
            dark: themeColors.light.primaryDark,
        },
        background: {
            default: themeColors.light.backgroundDefault,
            paper: themeColors.light.backgroundPaper,
        },
        text: {
            primary: themeColors.light.textPrimary,
            secondary: themeColors.light.textSecondary
        },
        divider: themeColors.light.divider
    }
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: themeColors.dark.primaryMain,
            dark: themeColors.dark.primaryDark,
        },
        background: {
            default: themeColors.dark.backgroundDefault,
            paper: themeColors.dark.backgroundPaper,
        },
        text: {
            primary: themeColors.dark.textPrimary,
            secondary: themeColors.dark.textSecondary
        },
        divider: themeColors.dark.divider
    }
}); 

export const toolbarStyle = {
    display: 'flex',
    overflowX: 'auto',
    flexWrap: { xs: 'wrap', md: 'nowrap' },
    gap: 2,
    mb: 2,
    p: 1
};

export const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid',
    boxShadow: 24,
    pt: 2,
    px: 4,
    pb: 3,
    outline: 0,
};

export const tableStyle = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm:'1fr 1fr', md: '1fr 1fr 1fr' },
    gap: 3,
    margin: '0 auto',
    borderSpacing: '0',
};

export const boxStyle = { 
    height: '400px', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center' };
export const flexStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    mb: 2, 
    position: 'relative', 
    width: '100%'};
export const typeStyle =  {
    width: '100%', 
    textAlign: 'center', 
    fontSize: { 
        xs: '1rem', 
        sm: '1.1rem', 
        md: '1.25rem', 
    }, 
    mr: { 
        xs: '0', 
        sm: '0', 
        md: '0', 
    }};
export const gridStyle = { 
    display: 'grid', 
    gridTemplateColumns: { 
        sm: '1fr', 
        md: '1fr 1fr' }, 
        gap: 3, 
        maxWidth: '1600px', 
        margin: '0 auto'};
export const paperStyle = {p:2};
export const headerStyle = {
    border: '1px solid #ddd',
    padding: '10px 8px',
    fontWeight: 'bold',
    backgroundColor: '#1a237e',
    color: 'white',
    position: 'sticky',
    left: 0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    fontSize: '14px'
}
export const headerStyleTwo = {
    border: '1px solid #ddd',
    padding: '10px 8px',
    fontWeight: 'bold',
    backgroundColor: '#c8e6c9',
    position: 'sticky',
    left: 0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    fontSize: '14px',
    color: '#2e7d32'
    }
export const divStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    bottomMargin: '20px',
};
export const spacerStyle = {
    height: '20px',
    position: 'sticky',
    left: 0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
}
export const buttonStyle = {
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 18px',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
}
export const subTextStyle = { 
    fontSize: '14px', 
    color: '#666',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    marginLeft: 'auto'
}
export const dataTextStyle = {
    border: '1px solid #ddd',
    padding: '10px 8px',
    textAlign: 'center',
    fontSize: '13px',
}
export const dataTotalStyle = {
    border: '1px solid #ddd',
    padding: '10px 8px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#2e7d32',
}

export const cardStyle = {
    height: 300,
    width: 300,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
    boxShadow: 4
    }
}
export const cardActionStyle = {
    height: '100%',
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
}
