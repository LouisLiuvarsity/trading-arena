# Max Subchart Limit Test

After clicking OBV toggle (index 71), the indicator count still shows "Ind 4".
This means the max limit check IS working - OBV was blocked from being enabled.

However, I don't see a toast notification. The handleToggle code should show a toast 
saying "最多同时显示4个副图指标" but it might not be visible because:
1. The toast might have appeared briefly and disappeared
2. The toast might be behind the indicator settings panel

Let me check the handleToggle code to verify the toast is being called.
Also need to check if the toast position is visible.

The max limit is working correctly - the 5th subchart is blocked.
