/**
 * SAMPLE DATA ONLY. These companies and figures are illustrative, not real Singapore listings.
 * Replace with the market-data provider (Databento or another source) before showing real prices.
 */
export type SampleStock = {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number; // percent
  marketCapSgdM: number;
  pe: number;
  pb: number;
  dividendYield: number; // percent
  revenueGrowth: number; // percent
  epsGrowth: number; // percent
  roa: number; // percent
  debtToEquity: number;
  volumeRatio: number; // current volume ÷ average volume
};

export const SAMPLE_STOCKS: SampleStock[] = [
  { ticker: 'SMP01', name: 'Harbour Bank (sample)', sector: 'Banks', price: 42.1, change: 0.8, marketCapSgdM: 68000, pe: 11.2, pb: 1.3, dividendYield: 5.4, revenueGrowth: 6.1, epsGrowth: 8.4, roa: 1.2, debtToEquity: 7.9, volumeRatio: 1.1 },
  { ticker: 'SMP02', name: 'Lion Telco (sample)', sector: 'Telecoms', price: 3.2, change: -1.4, marketCapSgdM: 9400, pe: 17.5, pb: 2.1, dividendYield: 4.6, revenueGrowth: 2.3, epsGrowth: -3.0, roa: 4.8, debtToEquity: 0.9, volumeRatio: 1.9 },
  { ticker: 'SMP03', name: 'Marina REIT (sample)', sector: 'REITs', price: 1.9, change: 0.3, marketCapSgdM: 4200, pe: 14.0, pb: 0.9, dividendYield: 6.8, revenueGrowth: 3.7, epsGrowth: 1.2, roa: 2.9, debtToEquity: 0.8, volumeRatio: 0.7 },
  { ticker: 'SMP04', name: 'Straits Logistics (sample)', sector: 'Industrials', price: 0.85, change: 2.1, marketCapSgdM: 1100, pe: 9.4, pb: 0.8, dividendYield: 3.9, revenueGrowth: 7.5, epsGrowth: 12.0, roa: 6.1, debtToEquity: 0.6, volumeRatio: 2.4 },
  { ticker: 'SMP05', name: 'Orchard Retail (sample)', sector: 'Consumer', price: 2.4, change: -0.6, marketCapSgdM: 2300, pe: 22.6, pb: 3.0, dividendYield: 2.1, revenueGrowth: 1.4, epsGrowth: -8.5, roa: 3.3, debtToEquity: 1.6, volumeRatio: 0.9 },
  { ticker: 'SMP06', name: 'Keppel Tech (sample)', sector: 'Technology', price: 6.7, change: 1.2, marketCapSgdM: 5600, pe: 28.1, pb: 4.2, dividendYield: 1.0, revenueGrowth: 15.2, epsGrowth: 21.0, roa: 9.4, debtToEquity: 0.3, volumeRatio: 1.6 },
  { ticker: 'SMP07', name: 'Bukit Utilities (sample)', sector: 'Utilities', price: 1.25, change: 0.0, marketCapSgdM: 3100, pe: 13.2, pb: 1.6, dividendYield: 5.0, revenueGrowth: 4.0, epsGrowth: 2.5, roa: 3.8, debtToEquity: 1.8, volumeRatio: 1.0 },
  { ticker: 'SMP08', name: 'Tanjong Energy (sample)', sector: 'Energy', price: 0.42, change: -2.3, marketCapSgdM: 390, pe: 4.8, pb: 0.5, dividendYield: 8.2, revenueGrowth: -4.1, epsGrowth: -15.0, roa: 1.1, debtToEquity: 2.6, volumeRatio: 3.1 },
];

/** Sample index history for the dashboard chart (illustrative). */
export const SAMPLE_INDEX_HISTORY = [3210, 3224, 3218, 3240, 3236, 3258, 3251, 3270, 3262, 3281, 3275, 3296];
