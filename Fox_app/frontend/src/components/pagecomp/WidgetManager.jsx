// Enhanced WidgetManager with true masonry layout and fixed reset button positioning
import React, { useState, Component, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Header } from '../pagecomp/Header.jsx'
import { gridStyle } from '../theme/themes.js';
import { GlobalSettingsContext, useGlobalSettings } from '../../data/GlobalSettingsContext.js';
import { useTheme } from '@emotion/react';

const API_BASE = process.env.REACT_APP_API_BASE;
const debug = false; // Set to true to enable debug logs

// Error Boundary to catch widget rendering errors
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Widget Error:', error, errorInfo, 'Widget ID:', this.props.widgetId);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Typography color="error">
                    Widget Error: {this.state.error?.message || 'Unknown error'}
                </Typography>
            );
        }

        return this.props.children;
    }
}

// Custom hook for masonry layout
const useMasonryLayout = (widgets, layoutMode, containerRef) => {
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const lastContainerRef = useRef(null);

    useLayoutEffect(() => {
        if(containerRef?.current){
            lastContainerRef.current = containerRef.current;
        }
    });
    
    useLayoutEffect(() => {
        if (debug) console.log('🚀 useMasonryLayout - Effect triggered', { 
            layoutMode, 
            widgetsCount: widgets.length, 
            hasContainer: !!containerRef.current 
        });

        if (layoutMode !== 'masonry') {
            if (debug) console.log('❌ Not masonry mode, layoutMode:', layoutMode);
            if(lastContainerRef.current){
                resetMasonryStyles(lastContainerRef.current);
            }
            setIsLayoutReady(true);
            return;
        }

        if (!containerRef.current) {
            if (debug) console.log('❌ No container ref found');
            setIsLayoutReady(true);
            return;
        }

        const container = containerRef.current;
        let items = [];
        let resizeObserver;
        let mutationObserver;
        let timeoutId;

        const updateLayout = () => {
            items = Array.from(container.children);
            if (debug) console.log('🔄 updateLayout called - found', items.length, 'children');
            
            if (items.length === 0) {
                if (debug) console.log('❌ No items found in container');
                return;
            }

            // Clear any existing timeout
            if (timeoutId) clearTimeout(timeoutId);
            
            // Delay layout to ensure widgets are fully rendered
            timeoutId = setTimeout(() => {
                requestAnimationFrame(() => {
                    if (debug) console.log('⚡ Calling layoutMasonry');
                    layoutMasonry(container, items);
                    setIsLayoutReady(true);
                });
            }, 100);
        };

        const setupObservers = () => {
            if (debug) console.log('👀 Setting up observers');
            // Clean up existing observers
            if (resizeObserver) resizeObserver.disconnect();
            if (mutationObserver) mutationObserver.disconnect();

            // Setup ResizeObserver for size changes
            resizeObserver = new ResizeObserver((entries) => {
                if (debug) console.log('📏 ResizeObserver triggered with', entries.length, 'entries');
                // Debounce rapid resize events
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    updateLayout();
                }, 50);
            });

            // Setup MutationObserver for DOM changes
            mutationObserver = new MutationObserver((mutations) => {
                if (debug) console.log('🔄 MutationObserver triggered with', mutations.length, 'mutations');
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || 
                        mutation.type === 'attributes' ||
                        mutation.type === 'subtree') {
                        shouldUpdate = true;
                    }
                });
                if (shouldUpdate) {
                    updateLayout();
                }
            });

            // Observe container
            resizeObserver.observe(container);
            mutationObserver.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });

            // Observe all current items
            items = Array.from(container.children);
            items.forEach(item => {
                resizeObserver.observe(item);
            });
        };

        // Initial setup
        setupObservers();
        
        // Wait for images and other content to load
        const checkAllLoaded = () => {
            const images = container.querySelectorAll('img');
            const promises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            });

            Promise.all(promises).then(() => {
                if (debug) console.log('🖼️ All images loaded, triggering layout');
                updateLayout();
            });
        };

        checkAllLoaded();

        return () => {
            if (debug) console.log('🧹 Cleaning up masonry layout');
            if (resizeObserver) resizeObserver.disconnect();
            if (mutationObserver) mutationObserver.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
            if(layoutMode === 'masonry' && container){
                resetMasonryStyles(container);
            }
        };
    }, [widgets, layoutMode]);

    const layoutMasonry = (container, items) => {
        if (!container || items.length === 0) return;

        if (debug) console.log('🔧 Layout Masonry - Starting layout with', items.length, 'items');

        const containerWidth = container.offsetWidth;
        const gap = 16;
        
        if (debug) console.log('📏 Container width:', containerWidth);
        
        // Calculate number of columns based on container width
        let columnCount = Math.floor(containerWidth / 280);
        columnCount = Math.max(1, Math.min(columnCount, 5));
        columnCount = 2;
        
        if (debug) console.log('📊 Column count:', columnCount);
        
        const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;
        const columnHeights = new Array(columnCount).fill(gap);

        if (debug) console.log('📏 Column width:', columnWidth);

        // Reset all items and clear any inherited styles that might affect height
        items.forEach((item, index) => {
            // Clear positioning
            item.style.position = 'static';
            item.style.left = 'auto';
            item.style.top = 'auto';
            item.style.transform = 'none';
            item.style.width = `${columnWidth}px`;
            item.style.transition = 'none';
            
            // Clear height-affecting styles
            item.style.height = 'auto';
            item.style.minHeight = 'auto';
            item.style.maxHeight = 'none';
            item.style.display = 'block';
            item.style.flex = 'none';
            item.style.alignSelf = 'auto';
            
            // Ensure box-sizing
            item.style.boxSizing = 'border-box';
            
            // IMPORTANT: Don't set overflow: hidden to prevent clipping reset button
            item.style.overflow = 'visible';
            
            if (debug) console.log(`📦 Item ${index} - Reset to natural sizing`);
        });

        // Force reflow to get accurate measurements
        container.offsetHeight;

        // Measure actual content height (excluding any artificial stretching)
        const itemHeights = items.map((item, index) => {
            // Get the actual content height
            const rect = item.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(item);
            
            // Calculate actual content height
            const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
            const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
            
            // Try to get the natural height by checking scrollHeight vs offsetHeight
            const naturalHeight = Math.min(item.scrollHeight, item.offsetHeight);
            
            if (debug) console.log(`📏 Item ${index} - Rect height: ${rect.height}, Offset: ${item.offsetHeight}, Scroll: ${item.scrollHeight}, Natural: ${naturalHeight}`);
            
            return naturalHeight;
        });

        // Now position items based on measured heights
        items.forEach((item, index) => {
            const itemHeight = itemHeights[index];
            
            // Find the shortest column
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
            
            // Position the item
            const left = shortestColumnIndex * (columnWidth + gap);
            const top = columnHeights[shortestColumnIndex];
            
            if (debug) console.log(`📍 Item ${index} - Positioning at (${left}, ${top}) in column ${shortestColumnIndex}, height: ${itemHeight}px`);
            
            item.style.position = 'absolute';
            item.style.left = `${left}px`;
            item.style.top = `${top}px`;
            item.style.width = `${columnWidth}px`;
            // Don't set explicit height to allow reset button positioning
            // item.style.height = `${itemHeight}px`;
            item.style.overflow = 'visible'; // Keep visible to prevent clipping reset button
            
            // Update column height with actual item height
            columnHeights[shortestColumnIndex] += itemHeight + gap;
            
            // Update debug info
            const debugEl = item.querySelector('[data-debug-info]');
            if (debugEl) {
                debugEl.textContent = `ID: ${item.dataset.widgetId} | H: ${itemHeight}px | Col: ${shortestColumnIndex}`;
            }
        });

        if (debug) console.log('📊 Final column heights:', columnHeights);

        // Re-enable transitions after positioning
        setTimeout(() => {
            items.forEach(item => {
                item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        }, 10);

        // Set container height to the tallest column
        const maxHeight = Math.max(...columnHeights);
        container.style.height = `${maxHeight}px`;
        container.style.position = 'relative';
        
        if (debug) console.log('📐 Layout complete - Container height:', maxHeight);
    };

    return { isLayoutReady };
};

// Remove all inline styles applied by the JS masonry
function resetMasonryStyles(rootEl) {
  if (!rootEl) return;
  // Reset container
  rootEl.style.height = '';
  rootEl.style.position = '';
  rootEl.style.width = '';
  rootEl.style.minHeight = '';

  // Reset each item that we touched during masonry
  const items = rootEl.querySelectorAll('.masonry-item');
  items.forEach((item) => {
    item.style.position = '';
    item.style.left = '';
    item.style.top = '';
    item.style.width = '';
    item.style.height = '';
    item.style.overflow = '';
    item.style.transform = '';
    item.style.transition = '';
    // If you changed display/flex/boxSizing during masonry, clear those too:
    item.style.display = '';
    item.style.flex = '';
    item.style.alignSelf = '';
    item.style.boxSizing = '';
  });
}


export function WidgetManager({
    widgets = []
}) {
    const { state, dispatch } = useGlobalSettings();
    const theme = useTheme();
    const containerRef = useRef(null);
    const { layoutMode } = state;
    const [layoutRevision, setLayoutRevision] = useState(0); // To force re-layout when widgets change
    
    // Use custom masonry hook
    const { isLayoutReady } = useMasonryLayout(widgets, layoutMode, containerRef);

    const handleResetWidget = (widgetId) => {
        dispatch({
            type: 'UPDATE_WIDGET_SETTINGS',
            widgetId,
            settings: { loaded: false } // Reset to unloaded state
        });
    };

    // CSS Grid masonry fallback (for browsers that support it)
    const cssGridMasonryStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gridTemplateRows: 'masonry', // CSS Grid Level 3 - limited browser support
        gap: '16px',
    };

    // Flexbox masonry alternative
    const flexMasonryStyle = {
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        height: '100vh', // You might want to adjust this
        gap: '16px'
    };

    // JavaScript masonry container style
    const jsMasonryStyle = {
        position: 'relative',
        width: '100%',
        minHeight: '100px'
    };

    // Column-count masonry (current approach but improved)
    const columnMasonryStyle = {
        columnCount: { xs: 1, sm: 2, md: 3, lg: 4 },
        columnGap: '16px',
        columnFill: 'balance' // Try to balance column heights
    };

    const masonryItemStyle = {
        display: 'block', // Changed from 'inline-block'
        width: '100%',
        marginBottom: 0, // Remove margin bottom
        breakInside: 'avoid',
        position: 'relative',
        boxSizing: 'border-box', // Ensure consistent box model
        overflow: 'visible', // Allow reset button to be visible
        '& > *': {
            position: 'relative',
            height: 'auto', // Ensure children don't stretch
            minHeight: 'auto' // Override any min-height
        }
    };

    const renderItem = ({ id, Widget }, index) => (
        <Box 
            key={id} 
            className="masonry-item"
            data-widget-id={id}
            sx={{
                ...(layoutMode === 'masonry' ? masonryItemStyle : { position: 'relative', '& > *': { position: 'relative' } }),
                // Debug styles - remove these after debugging
                border: debug ? '2px solid red': '',
                backgroundColor: debug ? 'rgba(255,0,0,0.1)' : '',
                boxSizing: 'border-box',
                overflow: 'visible' // Ensure reset button isn't clipped
            }}
        >
            {Widget ? (
                <ErrorBoundary widgetId={id}>
                    <Widget widgetId={id} />
                </ErrorBoundary>
            ) : (
                <Typography>Widget component missing for id: {id}</Typography>
            )}
            <IconButton
                onClick={() => handleResetWidget(id)}
                sx={{
                    position: 'absolute',
                    top: layoutMode === 'masonry' ? 7 : 8, // Adjust position for masonry mode
                    right: layoutMode === 'masonry' ? 7 : 8, // Adjust position for masonry mode
                    zIndex: 1001,
                    backgroundColor: theme.palette.background.default,
                    color: theme.palette.background.paper,
                    width: 32,
                    height: 32,
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease-in-out',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white'
                    },
                    // Add border and shadow for better visibility in masonry mode
                    // ...(layoutMode === 'masonry' && {
                    //     border: '2px solid white',
                    //     boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    // })
                }}
                size="small"
                title="Reset Widget"
            >
                <RefreshIcon fontSize="small" />
            </IconButton>
            {/* Debug info overlay */}
            <Box
                data-debug-info
                sx={debug ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    background: 'rgba(0,0,255,0.8)',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    zIndex: 1000,
                    pointerEvents: 'none'
                }:{ display: 'none' }}
            >
                ID: {id} | H: calculating...
            </Box>
        </Box>
    );

    if (!Array.isArray(widgets) || widgets.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Header
                    title="Add Widget to Dashboard"
                    subTitle="Choose a Widget first, then select from available parameters for that Widget"
                    titleVariant="h6"
                    subTitleVariant="body2"
                    titleColor="text.secondary"
                />
            </Box>
        )
    }
        
    // Choose masonry approach based on browser support or preference
    const useCSSGridMasonry = CSS.supports && CSS.supports('grid-template-rows', 'masonry');
    const useJSMasonry = true; // Set to true to use JavaScript masonry

    if (layoutMode === 'masonry') {
        if (useJSMasonry) {
            // JavaScript-based masonry (most reliable)
            return (
                <Box 
                    ref={containerRef} 
                    //className="masonry-debug"
                    data-layout-ready={isLayoutReady}
                    sx={{
                        ...jsMasonryStyle,
                        opacity: isLayoutReady ? 1 : 0.5,
                        transition: 'opacity 0.3s ease',
                        // Debug container styles
                        border: debug ? '3px solid blue' : '',
                        backgroundColor: debug ? 'rgba(0,0,255,0.05)' : '',
                        // Add padding to accommodate reset buttons positioned outside widget bounds
                        padding: '16px'
                    }}
                >
                    {widgets.map(renderItem)}
                </Box>
            );
        } else if (useCSSGridMasonry) {
            // CSS Grid masonry (Firefox only as of 2024)
            return (
                <Box sx={cssGridMasonryStyle}>
                    {widgets.map(renderItem)}
                </Box>
            );
        } else {
            // Improved column-count masonry
            return (
                <Box sx={columnMasonryStyle}>
                    {widgets.map(renderItem)}
                </Box>
            );
        }
    }

    // Default grid layout
    return (
        <Box sx={gridStyle}>
            {widgets.map(renderItem)}
        </Box>
    );
}