import { pgTable, serial, real, timestamp, integer, varchar, text } from 'drizzle-orm/pg-core';

// Price history table for storing Bitcoin price data
export const priceHistory = pgTable('price_history', {
  id: serial('id').primaryKey(),
  usd: real('usd').notNull(),
  eur: real('eur').notNull(),
  usd_24h_change: real('usd_24h_change').notNull(),
  eur_24h_change: real('eur_24h_change').notNull(),
  usd_72h_change: real('usd_72h_change'),
  eur_72h_change: real('eur_72h_change'),
  ath_usd: real('ath_usd'),
  ath_eur: real('ath_eur'),
  ath_date: varchar('ath_date', { length: 50 }),
  source: varchar('source', { length: 50 }).notNull(), // API source (coingecko, coinmarketcap, etc.)
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Visitor counter table
export const visitorCounter = pgTable('visitor_counter', {
  id: serial('id').primaryKey(),
  count: integer('count').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// Historical price data for charts (daily aggregates)
export const dailyPrices = pgTable('daily_prices', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD format
  openUsd: real('open_usd').notNull(),
  closeUsd: real('close_usd').notNull(),
  highUsd: real('high_usd').notNull(),
  lowUsd: real('low_usd').notNull(),
  openEur: real('open_eur').notNull(),
  closeEur: real('close_eur').notNull(),
  highEur: real('high_eur').notNull(),
  lowEur: real('low_eur').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Fear & Greed Index cache table
export const fearGreedCache = pgTable('fear_greed_cache', {
  id: serial('id').primaryKey(),
  value: integer('value').notNull(),
  classification: varchar('classification', { length: 50 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Bitcoin news cache table
export const bitcoinNewsCache = pgTable('bitcoin_news_cache', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  published_on: integer('published_on').notNull(),
  body: text('body'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ATH cache table (updated twice daily)
export const athCache = pgTable('ath_cache', {
  id: serial('id').primaryKey(),
  ath_usd: real('ath_usd').notNull(),
  ath_eur: real('ath_eur').notNull(),
  ath_date: varchar('ath_date', { length: 50 }).notNull(),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;
export type VisitorCounter = typeof visitorCounter.$inferSelect;
export type InsertVisitorCounter = typeof visitorCounter.$inferInsert;
export type DailyPrices = typeof dailyPrices.$inferSelect;
export type InsertDailyPrices = typeof dailyPrices.$inferInsert;
export type FearGreedCache = typeof fearGreedCache.$inferSelect;
export type InsertFearGreedCache = typeof fearGreedCache.$inferInsert;
export type BitcoinNewsCache = typeof bitcoinNewsCache.$inferSelect;
export type InsertBitcoinNewsCache = typeof bitcoinNewsCache.$inferInsert;
export type AthCache = typeof athCache.$inferSelect;
export type InsertAthCache = typeof athCache.$inferInsert;