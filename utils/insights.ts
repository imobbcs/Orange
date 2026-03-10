import { InsightCategory, EducationalTip } from '../types';

// Market insight messages - 3 variations per category for variety
const insightMessages = {
  high_volatility_minimal_change: [
    "Bitcoin moved up and down a lot today but ended up near where it started. It's a good day to watch how the price behaves and get a feel for the market.",
    "There's been a lot of action today — the price jumped around but settled back. Days like this are great for learning how Bitcoin moves over time.",
    "Today's been a bit of a rollercoaster for Bitcoin, but it ended up near where it began. These kinds of days are great for just watching and learning how Bitcoin behaves."
  ],
  recovery_after_dip: [
    "Bitcoin dropped recently but is starting to rise again. Some people buy during recoveries, others prefer to wait a bit longer.",
    "It looks like Bitcoin is bouncing back after a dip. You can keep an eye on it and decide if it feels like the right time for you.",
    "Bitcoin recently dipped but seems to be climbing again. You can keep following the trend and take your time deciding what feels right for you."
  ],
  conflicting_signals: [
    "The price has moved differently over the last day and the last few days. If you're unsure, it's okay to wait and check again tomorrow.",
    "The short-term and longer-term trends don't match right now. You might want to give it a bit more time before making a decision.",
    "Bitcoin's short-term and longer-term moves don't quite match right now. It's okay to pause — some days just aren't clear, and that's totally normal."
  ],
  significant_drop: [
    "Bitcoin's price has gone down a lot. If you've been waiting to buy at a lower price, this could be a good moment.",
    "There's been a big drop in the price of Bitcoin. Some people see this as a chance to buy while it's cheaper.",
    "There's been a noticeable drop in Bitcoin's price. Some people like to check in during times like this and think about their long-term plans."
  ],
  minor_drop: [
    "Bitcoin is a bit cheaper today. If you're thinking about getting started, it might be a nice time to begin.",
    "There's a small dip in the price today. A lot of people like to start buying when things are quiet like this.",
    "Bitcoin is slightly lower today. Many beginners find moments like these helpful when they're starting to ease into the market."
  ],
  strong_growth: [
    "Bitcoin's price is going up quickly. It might be better to wait until it calms down before you buy. You can always check back in a few days.",
    "Bitcoin is rising fast right now. Many people prefer to wait and buy when the price settles a bit — feel free to come back soon and see how it's doing.",
    "Bitcoin has gone up quite a bit today. Some people choose to wait for things to settle, others just like to watch how momentum plays out."
  ],
  moderate_growth: [
    "Bitcoin is slowly going up today. You could start buying bit by bit, but there's no need to rush.",
    "The price is rising steadily. It's okay to start now if you want, just take it slow.",
    "Bitcoin is moving upward steadily. If you're thinking about getting started, a slow and steady approach can work well."
  ],
  stable_market: [
    "Bitcoin's price hasn't changed much today. That can be a good time to buy without feeling rushed.",
    "Things are calm right now. Many people like to buy during quiet times like this.",
    "Bitcoin is staying fairly steady today. Calm days like this are popular with people who like to take their time and ease in."
  ]
};

export const insightCategories: InsightCategory[] = [
  {
    key: 'high_volatility_minimal_change',
    condition: (change24h, change72h) => {
      // Calculate volatility approximation - if big moves but small net change
      const volatility = Math.abs(change24h) + Math.abs(change72h - change24h);
      return volatility > 4 && Math.abs(change24h) < 1.5;
    },
  },
  {
    key: 'recovery_after_dip',
    condition: (change24h, change72h) => change72h <= -1.5 && change24h >= 2,
  },
  {
    key: 'conflicting_signals',
    condition: (change24h, change72h) => {
      // Different directions for 24h vs 72h trends
      return (change24h > 0 && change72h < -1) || (change24h < -1 && change72h > 0);
    },
  },
  {
    key: 'significant_drop',
    condition: (change24h, change72h) => change24h <= -4,
  },
  {
    key: 'minor_drop',
    condition: (change24h, change72h) => change24h >= -4 && change24h <= -1.5,
  },
  {
    key: 'strong_growth',
    condition: (change24h, change72h) => change24h >= 4,
  },
  {
    key: 'moderate_growth',
    condition: (change24h, change72h) => change24h >= 1.5 && change24h < 4,
  },
  {
    key: 'stable_market',
    condition: (change24h, change72h) => change24h >= -1.5 && change24h < 1.5,
  },
];

// Educational messages that rotate throughout the day
const educationalMessages = [
  "The simplest way to save in Bitcoin? Set up a recurring purchase, also known as Dollar-Cost Averaging (DCA). It's an easy, automated strategy many long-term Bitcoin savers use to smooth out price ups and downs over time.",
  "You don't need to buy a whole Bitcoin! You can start with just €1. Bitcoin is divisible, so you can buy small pieces and build up gradually.",
  "Historically, people who've held Bitcoin for 4 years or more have seen positive results. It's not about quick wins, long-term thinking has been key.",
  "Over the past decade, Bitcoin has outperformed traditional assets like stocks, gold, and real estate. That's why more people are paying attention.",
  "Bitcoin is often called digital gold. It's a secure, decentralized form of money that's trusted by individuals and institutions worldwide.",
  "Bitcoin runs on a global network, open to everyone, without banks or middlemen. It's money you control, accessible anytime, anywhere.",
  "Getting started is simple. You can use a Bitcoin-only app or broker designed for beginners, no technical knowledge required.",
  "After you buy Bitcoin, it's stored in a digital wallet, a secure app designed specifically to hold and manage your Bitcoin.",
  "Bitcoin is scarce: only 21 million will ever exist. This fixed supply is one reason many people see it as a store of value.",
  "Bitcoin doesn't use your real name, it relies on wallet addresses. While all transactions are public, your personal identity stays private.",
  "Bitcoin was launched in 2009 by someone (or a group) using the name Satoshi Nakamoto. To this day, nobody knows their true identity.",
  "Some online stores accept Bitcoin, but most people use it as a long-term savings tool rather than for everyday spending.",
  "Bitcoin was the first cryptocurrency and remains the most widely used and trusted. While many others have come and gone, Bitcoin stays focused on being decentralized digital money.",
  "Inflation means your money buys less over time. Prices go up, but your savings don't stretch as far. That's why many people look for ways to protect their purchasing power.",
  "A bull market is when prices are generally rising and confidence is high. A bear market is when prices are falling and people are more cautious. Both are natural parts of financial cycles."
];

export const educationalTips: EducationalTip[] = [
  { hour: 0, key: 'tip_1' },
  { hour: 2, key: 'tip_2' },
  { hour: 4, key: 'tip_3' },
  { hour: 6, key: 'tip_4' },
  { hour: 8, key: 'tip_5' },
  { hour: 10, key: 'tip_6' },
  { hour: 12, key: 'tip_7' },
  { hour: 14, key: 'tip_8' },
  { hour: 16, key: 'tip_9' },
  { hour: 18, key: 'tip_10' },
  { hour: 20, key: 'tip_11' },
  { hour: 22, key: 'tip_12' },
];

export function getCurrentTip(): string {
  const currentHour = new Date().getHours();
  // Cycle through all 15 messages throughout the day (24 hours / 15 messages ≈ 1.6 hours per message)
  const messageIndex = Math.floor((currentHour * 15) / 24);
  return `education.tip_${messageIndex + 1}`;
}

export function getInsightCategory(change24h: number, change72h: number): string {
  const category = insightCategories.find(cat => cat.condition(change24h, change72h));
  return category?.key || 'stable_market';
}

export function getInsightMessage(change24h: number, change72h: number): string {
  const categoryKey = getInsightCategory(change24h, change72h);
  
  // Select a random message variant (1, 2, or 3) from the category
  const randomIndex = Math.floor(Math.random() * 3) + 1;
  return `insights.${categoryKey}_${randomIndex}`;
}
