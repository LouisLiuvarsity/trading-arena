# Official Crosshair Sync Example

Key insight from the official example:

```js
function getCrosshairDataPoint(series, param) {
    if (!param.time) {
        return null;
    }
    const dataPoint = param.seriesData.get(series);
    return dataPoint || null;
}

function syncCrosshair(chart, series, dataPoint) {
    if (dataPoint) {
        chart.setCrosshairPosition(dataPoint.value, dataPoint.time, series);
        return;
    }
    chart.clearCrosshairPosition();
}

chart1.subscribeCrosshairMove(param => {
    const dataPoint = getCrosshairDataPoint(mainSeries1, param);
    syncCrosshair(chart2, mainSeries2, dataPoint);
});
```

CRITICAL: The official example passes `dataPoint.value` (a real number), NOT NaN!
The `param.seriesData.get(series)` gets the data from the SOURCE series, not the target.
Then it passes the SOURCE value to the TARGET chart's setCrosshairPosition.

But wait - the source chart's series data won't have the target chart's values.
Actually looking more carefully: 
- getCrosshairDataPoint gets data from the SOURCE chart's series (mainSeries1)
- syncCrosshair passes that value to the TARGET chart with the TARGET series (mainSeries2)

So the value is from the SOURCE series, but the series parameter is the TARGET series.
The value doesn't need to match the target series data - it just needs to be a valid number
to position the horizontal line. The time is what matters for the vertical line.

MY BUG: I was using NaN as the value, which likely causes setCrosshairPosition to not render.
FIX: Need to get the actual data point value from the source series and pass it.
Or better: get the data point from the TARGET series at the given time.

Actually the simplest fix: get the source series data point value and pass it. The vertical
line will sync, and the horizontal line position doesn't matter much since it's a different chart.

But actually for our case, we need to get the data from the SOURCE chart's series. When moving
on the main chart, param.seriesData.get(candleSeries) gives us the candle data. We pass
dataPoint.close to the subchart's setCrosshairPosition with the subchart's primary series.
