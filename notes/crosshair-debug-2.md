# Crosshair Debug 2 - Key Findings

The handler IS firing correctly:
- DataPoint: {"open":88.37,"high":88.38,"low":88.23,"close":88.25,"time":1773385200}
- seriesDataSize: 2 (candle series + volume series on main chart)
- targetCount: 3 (3 subcharts to sync to)

The value being passed is dataPoint.close = 88.25, which is a valid number.
The time is 1773385200, which is valid.

So setCrosshairPosition IS being called with valid parameters.
But the crosshair is NOT visible in the subcharts.

WAIT - I just realized the issue! The `param.seriesData.get(series)` gets data from the 
SOURCE chart's series. The main chart has candle + volume series. When we call 
`getCrosshairDataPoint(sourcePair.series, param)`, we're getting the candle data.

Then we call `syncCrosshair(targetPair.chart, targetPair.series, dataPoint)` which calls:
`targetChart.setCrosshairPosition(88.25, time, targetSeries)`

But targetSeries is the subchart's primary series (e.g., VOL histogram). The value 88.25 
is way outside the VOL chart's price range (which is in thousands). This might cause the 
crosshair to be positioned off-screen vertically.

BUT the vertical line should still appear regardless of the price value...

Actually, let me re-read the official example more carefully. In the official example, 
both charts use LineSeries with similar value ranges. The value parameter positions the 
HORIZONTAL crosshair line. If the value is outside the visible range, the horizontal line 
won't show, but the VERTICAL line should still appear.

Hmm, unless lightweight-charts v5 has a bug where setCrosshairPosition with an out-of-range 
price doesn't show the vertical line either.

ALTERNATIVE APPROACH: Instead of using the source data point value, get the data point 
from the TARGET series at the same time. This way the price value will be in range.
