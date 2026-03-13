# Crosshair Sync Test 5 - coordinateToPrice approach

Mouse at (200, 300) on main chart:
- Main chart: Shows crosshair with horizontal line at ~88.90 and vertical dashed line
- VOL subchart: NO visible vertical crosshair line
- RSI subchart: NO visible vertical crosshair line  
- KDJ subchart: NO visible vertical crosshair line

Still not working. The coordinateToPrice approach also fails.

Let me think about this differently. The issue might be:
1. setCrosshairPosition might not work at all in lightweight-charts v5 for cross-chart sync
2. Or there's a timing/rendering issue

Alternative approach: Instead of using setCrosshairPosition API, I should use a 
CUSTOM OVERLAY approach - draw a vertical line manually using CSS/DOM overlay 
that follows the mouse position across all chart containers.

This is actually a more reliable approach used by many trading platforms:
- Listen to mousemove on the chart wrapper
- Calculate the X position relative to the wrapper
- Draw a vertical line (absolute positioned div) at that X position
- The line spans across main chart + all subcharts

This bypasses the lightweight-charts API entirely and is guaranteed to work.
