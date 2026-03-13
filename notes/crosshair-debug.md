# Crosshair Debug Findings

1. CrosshairSync setup ran 3 times: version 0 twice, version 1 once
2. 4 charts are registered (main + 3 subcharts)
3. No "No series for target chart" messages → primarySeries IS available
4. No "setCrosshairPosition error" messages → the call doesn't throw
5. But the crosshair vertical line is NOT visible in subcharts

This means setCrosshairPosition(NaN, time, series) is being called but not producing a visible result.

Possible issue: NaN as the value might not work properly. The lightweight-charts docs say:
- setCrosshairPosition(price, time, series) - price should be a valid number
- Using NaN might cause the crosshair to not render

Solution: Instead of NaN, we need to pass a valid price value. We can get the last data point 
of the target series at the given time, or we can use a different approach entirely.

Alternative approach: Use the logical index approach - convert time to logical index and use 
that to position the crosshair. Or simply pass a mid-range value for the target series.

Better solution: For each target chart, find the data point at the given time from the target 
series and use its value. If no exact match, use the closest value.
