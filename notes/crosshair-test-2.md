# Crosshair Sync Test 2

Looking at the screenshot with mouse at (200, 250) on main chart:
- Main chart: shows crosshair (horizontal + vertical dashed lines visible)
- VOL subchart: no visible vertical crosshair line synced from main
- RSI subchart: no visible vertical crosshair line synced from main
- KDJ subchart: no visible vertical crosshair line synced from main

The crosshair sync is still NOT working. The vertical line from the main chart is not being replicated in the subcharts.

Possible issues:
1. The crosshairVersion state update might not be triggering properly
2. The setCrosshairPosition with NaN value might not work correctly
3. The crosshair mode might need to be set differently

Need to check browser console for errors.
