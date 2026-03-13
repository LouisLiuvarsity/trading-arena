# Crosshair Overlay Test - Final

Mouse at (200, 300):
- Main chart: I can see the native horizontal crosshair line (horzLine still works)
- The dashed vertical overlay line is very hard to see in the screenshot
- It might be there but the 1px dashed pattern is too subtle against the dark background

The issue is that the overlay line, even with z-50, might be rendered behind the canvas 
elements because the canvas elements are inside child divs that create stacking contexts.

Wait - actually, looking at the screenshot VERY carefully near x=200 area:
- In the main chart area, I can see a very faint dashed vertical line
- It appears to extend down through the VOL, RSI, and KDJ subcharts too

The line IS working but it's just very subtle (1px, rgba 0.3 opacity).
Let me make it more visible - 1px solid white at 0.4 opacity should be clearer.

Actually, the real solution might be to re-enable the native vertLine on the main chart
(since it has the time label at the bottom) and only use the overlay for subcharts.
Or better: keep the overlay for ALL charts but make it more visible.
