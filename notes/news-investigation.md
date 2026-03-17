# News Module Investigation

## Key Findings

1. **News API works correctly** — `/api/competitions/60001/news?lang=zh&limit=50` returns 50 news items with `isLive: true`
2. **Competition 60001 is live** — Status is `live`, title "uyuyuyuyu"
3. **Network logs confirm** — The browser DID make a news request and received 50 items successfully
4. **The news data IS being fetched** — The issue is in the UI rendering, not the API

## The Real Question
Since the API returns data and the network log shows it was received, why isn't it showing?
- Need to check if the NewsFeed component is actually mounted/visible in the layout
- Need to check if the "news" tab is the default or needs to be clicked
- On desktop: news is in a tab (rightTab === "news") but default is "chat"
- On mobile: news is in mobilePanel === "news"

## TradingPage Layout
- Desktop: right panel has tabs: chat, news, etc. Default is "chat"
- The NewsTicker at the bottom should show scrolling news regardless of tab
- Need to verify NewsTicker is rendering
