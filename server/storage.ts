import { priceHistory, visitorCounter, dailyPrices, type PriceHistory, type InsertPriceHistory, type VisitorCounter, type InsertVisitorCounter } from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { PriceData, HistoryData, VisitorData } from "../types";

export interface IStorage {
  savePriceData(data: PriceData, source: string): Promise<void>;
  getLatestPrice(): Promise<(PriceData & { timestamp?: Date }) | null>;
  getPriceHistory(days: number): Promise<HistoryData>;
  getVisitorCount(): Promise<VisitorData>;
  incrementVisitorCount(): Promise<VisitorData>;
}

export class DatabaseStorage implements IStorage {
  async savePriceData(data: PriceData, source: string): Promise<void> {
    try {
      await db.insert(priceHistory).values({
        usd: data.usd,
        eur: data.eur,
        usd_24h_change: data.usd_24h_change,
        eur_24h_change: data.eur_24h_change,
        usd_72h_change: data.usd_72h_change || 0,
        eur_72h_change: data.eur_72h_change || 0,
        ath_usd: null,
        ath_eur: null,
        ath_date: null,
        source: source,
      });
    } catch (error) {
      console.error('Error saving price data to database:', error);
    }
  }

  async getLatestPrice(): Promise<(PriceData & { timestamp?: Date }) | null> {
    try {
      const [latest] = await db
        .select()
        .from(priceHistory)
        .orderBy(desc(priceHistory.timestamp))
        .limit(1);

      if (!latest) return null;

      return {
        usd: latest.usd,
        eur: latest.eur,
        usd_24h_change: latest.usd_24h_change,
        eur_24h_change: latest.eur_24h_change,
        usd_72h_change: latest.usd_72h_change || 0,
        eur_72h_change: latest.eur_72h_change || 0,
        timestamp: latest.timestamp,
      };
    } catch (error) {
      console.error('Error getting latest price from database:', error);
      return null;
    }
  }

  async getPriceHistory(days: number): Promise<HistoryData> {
    try {
      const hoursBack = days * 24;
      const prices = await db
        .select({
          timestamp: priceHistory.timestamp,
          usd: priceHistory.usd,
        })
        .from(priceHistory)
        .where(sql`${priceHistory.timestamp} >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'`)
        .orderBy(priceHistory.timestamp);

      const formattedPrices: [number, number][] = prices.map(price => [
        new Date(price.timestamp).getTime(),
        price.usd,
      ]);

      return { prices: formattedPrices };
    } catch (error) {
      console.error('Error getting price history from database:', error);
      return { prices: [] };
    }
  }

  async getVisitorCount(): Promise<VisitorData> {
    try {
      const [counter] = await db
        .select()
        .from(visitorCounter)
        .orderBy(desc(visitorCounter.lastUpdated))
        .limit(1);

      if (!counter) {
        // Initialize if no counter exists
        const [newCounter] = await db
          .insert(visitorCounter)
          .values({ count: 0 })
          .returning();
        
        return {
          count: newCounter.count,
          lastUpdated: newCounter.lastUpdated.toISOString(),
        };
      }

      return {
        count: counter.count,
        lastUpdated: counter.lastUpdated.toISOString(),
      };
    } catch (error) {
      console.error('Error getting visitor count from database:', error);
      return { count: 0, lastUpdated: new Date().toISOString() };
    }
  }

  async incrementVisitorCount(): Promise<VisitorData> {
    try {
      const [counter] = await db
        .select()
        .from(visitorCounter)
        .orderBy(desc(visitorCounter.lastUpdated))
        .limit(1);

      if (!counter) {
        // Create first counter
        const [newCounter] = await db
          .insert(visitorCounter)
          .values({ count: 1 })
          .returning();
        
        return {
          count: newCounter.count,
          lastUpdated: newCounter.lastUpdated.toISOString(),
        };
      }

      // Update existing counter
      const [updatedCounter] = await db
        .update(visitorCounter)
        .set({ 
          count: counter.count + 1,
          lastUpdated: new Date(),
        })
        .where(eq(visitorCounter.id, counter.id))
        .returning();

      return {
        count: updatedCounter.count,
        lastUpdated: updatedCounter.lastUpdated.toISOString(),
      };
    } catch (error) {
      console.error('Error incrementing visitor count in database:', error);
      // Fallback to current count
      const current = await this.getVisitorCount();
      return current;
    }
  }
}

export const storage = new DatabaseStorage();