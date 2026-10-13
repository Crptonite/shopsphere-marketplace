/** Trade section navigation, grouped as in the Trade route map. */
export const TRADE_NAV: { title: string; links: [string, string][] }[] = [
  { title: 'Overview', links: [['/trade', 'Dashboard & search']] },
  { title: 'Discover', links: [['/trade/screener', 'Screener'], ['/trade/dividend-income', 'Dividend income'], ['/trade/ai-analysis', 'AI analysis'], ['/trade/ai-chat', 'OpenRouter'], ['/trade/market-movers', 'Market movers'], ['/trade/market-news', 'Market news']] },
  { title: 'Workspace', links: [['/trade/workspace/watchlist', 'Watchlist'], ['/trade/workspace/portfolio', 'Portfolio'], ['/trade/workspace/dca-reminders', 'DCA reminders'], ['/trade/workspace/alerts', 'Alerts']] },
  { title: 'Pro', links: [['/trade/pro/data', 'Data'], ['/trade/pro/similar-stocks', 'Similar stocks'], ['/trade/pro/marketplace', 'Marketplace']] },
  { title: 'Learn', links: [['/trade/learn/basics', 'Basics'], ['/trade/app-ideas', 'App ideas']] },
];
