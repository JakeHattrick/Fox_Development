// Enhanced GlobalSettingsContext.js
import React, { createContext, useContext, useReducer, useEffect, useMemo, useState } from 'react';
import { persistenceManager } from '../utils/persistence.js';
import { getInitialStartDate, normalizeDate } from '../utils/dateUtils.js';
import { widgetList } from './widgetList.js'; // Import widgetList
import { reconstructWidgets } from '../utils/widgetUtils.js';

const GlobalSettingsContext = createContext();

const initialState = {
  startDate: getInitialStartDate(7),
  endDate: normalizeDate.end(new Date()),
  barLimit: 7,
  widgets: [],
  widgetSettings: {}, // Initialize as empty object, not undefined
  currentPage: 'dashboard',
  currentMode: 'Home', // 'quality', 'te', or 'dev' (home is default landing page),
  layoutMode: 'grid' 
};

function settingsReducer(state, action) {
  //console.log('Reducer called:', { type: action.type, action, currentState: state });
  
  switch (action.type) {
    case 'SET_DATE_RANGE':
      return { ...state, startDate: action.startDate, endDate: action.endDate };
    
    case 'SET_BAR_LIMIT':
      return { ...state, barLimit: action.barLimit };
    
    case 'ADD_WIDGET':
      //console.log('ADD_WIDGET reducer executing', action.widget);
      const newState = { 
        ...state, 
        widgets: [...state.widgets, action.widget],
        // Initialize empty settings for new widget
        widgetSettings: {
          ...state.widgetSettings,
          [action.widget.id]: {}
        }
      };
      //console.log('New state after ADD_WIDGET:', newState);
      return newState;
    
    case 'REMOVE_WIDGETS':
      const remainingWidgets = state.widgets.filter(w => !action.widgetIds.includes(w.id));
      const remainingSettings = { ...state.widgetSettings };
      
      // Remove settings for deleted widgets
      action.widgetIds.forEach(id => {
        delete remainingSettings[id];
      });
      
      return { 
        ...state, 
        widgets: remainingWidgets,
        widgetSettings: remainingSettings
      };
    
    case 'REORDER_WIDGETS':
      return { ...state, widgets: action.widgets };
    
    case 'UPDATE_WIDGET_SETTINGS':
      return {
        ...state,
        widgetSettings: {
          ...state.widgetSettings,
          [action.widgetId]: {
            ...(state.widgetSettings[action.widgetId] || {}), // Handle case where widget settings don't exist yet
            ...action.settings
          }
        }
      };
    
    case 'LOAD_SETTINGS':
      return { 
        ...state, 
        ...action.settings,
        // Ensure widgetSettings always exists as an object
        widgetSettings: action.settings.widgetSettings || {}
      };
    
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };

    case 'SET_MODE':
      return { ...state, currentMode: action.mode };
    
    case 'SET_LAYOUT_MODE':
      return { ...state, layoutMode: action.mode };

    default:
      return state;
  }
}

export const GlobalSettingsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  // Initial load - only run once
  useEffect(() => {
    const loadSettings = async () => {
      let settings = persistenceManager.loadLocal();
      
      // Optional: Load from server if user is authenticated
      // const userId = getCurrentUserId();
      // if (userId && !settings) {
      //   settings = await persistenceManager.loadRemote(userId);
      // }
      
      if (settings) {
        // Reconstruct widgets with proper components
        if (settings.widgets) {
          settings.widgets = reconstructWidgets(settings.widgets);
        }
        dispatch({ type: 'LOAD_SETTINGS', settings });
      }
      setIsInitialized(true);
    };
    
    loadSettings();
  }, []);

  // Save settings - but only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const settingsToSave = {
      startDate: state.startDate,
      endDate: state.endDate,
      barLimit: state.barLimit,
      widgets: state.widgets.map(w => ({
        id: w.id,
        type: w.type,
        position: w.position
      })),
      widgetSettings: state.widgetSettings, // Save widget-specific settings
      layoutMode: state.layoutMode, // Save layout mode
      currentMode: state.currentMode
      
    };
    
    persistenceManager.saveLocal(settingsToSave);
    
    // Optional: Also save to server
    // const userId = getCurrentUserId();
    // if (userId) {
    //   persistenceManager.saveRemote(userId, settingsToSave);
    // }
  }, [
    state.startDate, 
    state.endDate, 
    state.barLimit, 
    state.widgets, 
    state.widgetSettings, // Add widgetSettings to dependencies
    state.layoutMode, // Add layoutMode to dependencies
    state.currentMode,
    isInitialized
  ]);

  return (
    <GlobalSettingsContext.Provider value={contextValue}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export const useGlobalSettings = () => {
  const context = useContext(GlobalSettingsContext);
  if (!context) {
    throw new Error('useGlobalSettings must be used within GlobalSettingsProvider');
  }
  return context;
};

export { GlobalSettingsContext };