# Crosshair Overlay Plan

## Current JSX Structure:
```
<div className="flex flex-col h-full relative">  ← root wrapper
  <div> timeframe bar </div>
  <div ref={mainContainerRef} className="relative flex-1 min-h-0"> ← main chart
    ...overlays...
  </div>
  <div ref={subContainersWrapperRef} className="flex flex-col shrink-0" /> ← subchart wrapper
  {showSettings && <IndicatorSettings />}
</div>
```

## Plan:
1. Add a new ref `chartAreaRef` wrapping both mainContainerRef and subContainersWrapperRef
2. Add a crosshair overlay div (absolute positioned, pointer-events: none) inside chartAreaRef
3. Listen to mousemove on chartAreaRef to track X position
4. Show/hide the vertical line based on mouse enter/leave
5. Remove the entire setCrosshairPosition-based crosshair sync useEffect

The overlay line will be:
- position: absolute, top: 0, bottom: 0, width: 1px
- background: rgba(255,255,255,0.2) with dashed style
- pointer-events: none so it doesn't interfere with chart interaction
- z-index above charts but below popovers

The X position is relative to the chartAreaRef wrapper.
