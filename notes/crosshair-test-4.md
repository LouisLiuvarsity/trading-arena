# Crosshair Sync Test 4

Mouse at (100, 300) on main chart:
- Main chart: shows crosshair with horizontal line at ~88.90 and vertical line
- VOL subchart: NO visible vertical crosshair line
- RSI subchart: NO visible vertical crosshair line  
- KDJ subchart: NO visible vertical crosshair line

The crosshair sync is STILL not working visually. The vertical lines are not appearing in subcharts.

Wait - looking more carefully at the screenshot, I notice:
- The main chart has a crosshair (horizontal + vertical dashed lines)
- The subcharts do NOT show any vertical dashed lines

The issue might be that the crosshair mode on subcharts is set to something that doesn't show the vertical line.
Let me check the subchart creation code to see what crosshair mode is set.

Possible fix: The subchart charts might have crosshair.vertLine.visible = false or crosshair mode = 0 (Normal)
which only shows crosshair when mouse is directly on that chart, not when set programmatically.

Actually, looking at the lightweight-charts docs, setCrosshairPosition should work regardless of mode.
The issue might be that the crosshair.mode needs to be CrosshairMode.Normal (0) for programmatic control.
