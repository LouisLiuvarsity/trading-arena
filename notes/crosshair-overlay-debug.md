# Crosshair Overlay Debug

chartArea: 668x848 - EXISTS and has correct dimensions
crosshairLine: exists, opacity=1, transform=translateX(250px) - IS positioned correctly!

So the line IS there, positioned at x=250, opacity=1. But it's not visible in the screenshot.

Possible reasons:
1. z-index too low - z-[5] might be below the canvas elements
2. The line is too thin (w-px = 1px) and the background color is too subtle
3. The canvas elements might have a higher stacking context

Solution: Try increasing z-index to z-[15] or z-[20] to ensure it's above the canvas.
Also try making the line more visible (brighter color, maybe 2px wide).

The lightweight-charts canvas elements are positioned absolutely within their containers.
The overlay line needs to be above ALL of them.
