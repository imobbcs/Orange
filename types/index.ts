export interface PriceData {
  usd: number;
  eur: number;
  usd_24h_change: number;
  eur_24h_change: number;
  usd_72h_change?: number;
  eur_72h_change?: number;
  ath_usd?: number;
  ath_eur?: number;
  ath_date?: string;
}

export interface HistoryData {
  prices: [number, number][];
}

export interface VisitorData {
  count: number;
  lastUpdated: string;
}

export interface InsightCategory {
  key: string;
  condition: (change24h: number, change72h: number) => boolean;
}

export interface EducationalTip {
  hour: number;
  key: string;
}
