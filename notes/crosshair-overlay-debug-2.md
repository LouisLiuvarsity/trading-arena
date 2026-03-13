# Crosshair Overlay Debug 2

After setting z-index: 50, background: red, width: 2px:
- I can see a thin vertical line in the MAIN CHART area at x~130 (following mouse at x=200)
- The line appears to span the full height of the main chart
- BUT it does NOT extend into the subchart areas (VOL, RSI, KDJ)

This confirms the issue: the overlay line is positioned absolute within chartAreaRef,
but the child containers (mainContainerRef with position:relative) create stacking contexts
that clip or overlap the line.

Actually wait - looking more carefully at the screenshot, I can see a faint vertical line
at about x=130 that goes through the main chart. It's visible!

The problem is that the line might be clipped by the mainContainerRef div which has 
overflow hidden or something similar. Or the subchart containers are rendering on top.

Actually, the real issue is that the overlay line is a child of chartAreaRef, but 
mainContainerRef has `position: relative` which creates a new stacking context. 
The canvases inside mainContainerRef are in THAT stacking context, not chartAreaRef's.

Since the overlay line has z-index 50 in chartAreaRef's context, and mainContainerRef 
has z-index auto, the overlay line should paint AFTER mainContainerRef's children.

Wait - I see the line! It's at about x=130 in the screenshot. It's a thin gray/red line.
It goes through the main chart but stops at the subchart boundary.

The issue is that the subchart containers are BELOW mainContainerRef in the DOM,
and they also have their own stacking contexts. The overlay line's absolute positioning
with top:0 bottom:0 should make it span the full height of chartAreaRef.

Let me check if the line actually has the full height.
