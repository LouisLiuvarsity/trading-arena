# Crosshair Overlay Test

Mouse at (250, 300) on main chart:
- Main chart: Shows horizontal crosshair line (horzLine still visible, good)
- NO visible vertical overlay line across charts

The overlay line is not showing. Possible reasons:
1. The chartAreaRef wrapper might not be receiving mouse events because the canvas elements 
   inside the lightweight-charts consume them
2. The overlay div might be behind the canvas z-index wise

Need to check:
- Is the chartAreaRef wrapper actually wrapping both main chart and subcharts?
- Is the mousemove event firing on chartAreaRef?
- Is the overlay line z-index high enough?

The canvas elements from lightweight-charts have their own event handling.
The overlay line has z-[5] which should be above the canvas.

The issue might be that the canvas elements capture mouse events before they reach the wrapper div.
Solution: Use `pointer-events: none` on the overlay line (already done) but the issue is that 
mousemove on the wrapper div might not fire if the canvas captures it.

Actually, mousemove events DO bubble up from canvas to parent divs. So the chartAreaRef should 
receive them. Let me check if the ref is properly attached and the div has the right dimensions.

Wait - looking at the screenshot more carefully, I can see the main chart's native crosshair 
horizontal line IS showing. But there's no vertical line at all (neither native nor overlay).
This confirms the native vertLine is hidden (good), but the overlay is not showing.

The issue is likely that the overlay div's opacity is 0 and the mousemove handler isn't firing,
OR the transform is not being applied correctly.
