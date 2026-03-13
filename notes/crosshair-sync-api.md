# Crosshair Sync API - lightweight-charts

## Key API:
- `chart.setCrosshairPosition(price, time, series)` - requires a series reference
- `chart.clearCrosshairPosition()` - clears crosshair

## Pattern from official tutorial:
```js
function getCrosshairDataPoint(series, param) {
    if (!param.time) return null;
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

## Key insight:
- setCrosshairPosition needs: price value, time, AND a series reference
- param.seriesData.get(series) gets the data point at the crosshair time for that series
- Need to store a "primary series" reference for each chart to use in sync
