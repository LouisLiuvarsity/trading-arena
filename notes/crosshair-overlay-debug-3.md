# Crosshair Overlay Debug 3

Line rect: top=154, bottom=1002, height=848, left=200, width=2
Parent rect: top=154, bottom=1002, height=848
Line covers parent? YES

So the line spans the full height of chartAreaRef (848px).
The line is at left=200 (correct, following mouse).
The line is 2px wide and red.

BUT it's not visible in the subcharts because the child divs (mainContainerRef with 
position:relative) create stacking contexts that paint OVER the overlay line.

The fix: Instead of z-[5] or z-[50] on the overlay line, we need to ensure the 
overlay line paints ABOVE all child stacking contexts.

In CSS, when a parent has `position: relative` (or creates a stacking context), 
its children with z-index create a local stacking context. But the overlay line 
is a sibling of mainContainerRef, not a child.

Actually, the issue is that mainContainerRef has `position: relative` with `z-index: auto`.
The overlay line has `position: absolute` with `z-index: 50`.
Both are children of chartAreaRef.

In this case, the overlay line (z-index: 50) should paint ABOVE mainContainerRef (z-index: auto).
And it does for the main chart! But the subchart containers might have different stacking.

Wait - looking at the screenshot again more carefully, I think the line IS visible 
across all charts. The thin vertical line at x~130-200 area appears to go through 
the main chart and into the subcharts. It might just be hard to see because it's 
only 2px wide and the screenshot compression makes it hard to distinguish.

Actually, looking at the previous screenshot, the line at x~130 appears to go all the 
way down through VOL, RSI, and KDJ subcharts! It's just very subtle.

The real issue was the ORIGINAL z-[5] was too low. With z-[50] it works.
Let me update the code to use z-[50] and a slightly more visible style.
