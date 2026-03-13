# OBV Toggle Test

I see OBV is now expanded showing "MA Period" with value 20 and a Reset button.
But the indicator count still shows "Ind 4", meaning OBV was NOT enabled.

Wait - looking more carefully at the screenshot, OBV row shows a toggle icon on the left.
The button at index 71 next to "OBV" text might be the toggle.

Actually, looking at the element list:
- index 71: button {} (this might be the toggle for OBV)
- index 72: div {} OBV OBV
- index 73: button {} (this might be the settings expand)

Let me try index 71 which should be the toggle for OBV.

But wait - the indicator count still shows "Ind 4" which means my max limit check 
might have blocked it silently (without toast). Let me check the handleToggle code.
