// Context-strip copy, EN + DE. Descriptive, third person, no advice, no em dashes.
// Edit freely: keys are referenced by lib/macro/compute.ts.

export type ContextKey =
  | 'weekend'
  | 'holiday'
  | 'quiet'
  | 'btcOnlyDown'
  | 'btcOnlyUp'
  | 'withMarketDown'
  | 'withMarketUp'
  | 'againstMarketDown'
  | 'againstMarketUp';

export const CONTEXT_COPY: Record<ContextKey, { en: string; de: string }> = {
  weekend: {
    en: 'US markets are closed for the weekend. Bitcoin is trading on its own until Monday.',
    de: 'Die US-Börsen sind am Wochenende geschlossen. Bitcoin handelt bis Montag für sich allein.',
  },
  holiday: {
    en: 'US markets are closed today. Bitcoin is trading on its own until the next session.',
    de: 'Die US-Börsen sind heute geschlossen. Bitcoin handelt bis zur nächsten Sitzung für sich allein.',
  },
  quiet: {
    en: 'A routine day for Bitcoin. The move is within its normal daily range.',
    de: 'Ein normaler Tag für Bitcoin. Die Bewegung liegt im üblichen Tagesbereich.',
  },
  btcOnlyDown: {
    en: 'A Bitcoin-specific drop. US stocks were flat in the last session.',
    de: 'Ein Bitcoin-spezifischer Rückgang. US-Aktien blieben in der letzten Sitzung stabil.',
  },
  btcOnlyUp: {
    en: 'A Bitcoin-specific rise. US stocks were flat in the last session.',
    de: 'Ein Bitcoin-spezifischer Anstieg. US-Aktien blieben in der letzten Sitzung stabil.',
  },
  withMarketDown: {
    en: 'Broad risk-off. Bitcoin is falling together with US stocks.',
    de: 'Breiter Risk-off. Bitcoin fällt gemeinsam mit US-Aktien.',
  },
  withMarketUp: {
    en: 'Broad risk-on. Bitcoin is rising together with US stocks.',
    de: 'Breiter Risk-on. Bitcoin steigt gemeinsam mit US-Aktien.',
  },
  againstMarketDown: {
    en: 'Bitcoin is falling while US stocks rose in the last session.',
    de: 'Bitcoin fällt, während US-Aktien in der letzten Sitzung gestiegen sind.',
  },
  againstMarketUp: {
    en: 'Bitcoin is rising while US stocks fell in the last session.',
    de: 'Bitcoin steigt, während US-Aktien in der letzten Sitzung gefallen sind.',
  },
};

export const DOLLAR_COPY = {
  stronger: { en: 'The US dollar is stronger.', de: 'Der US-Dollar ist stärker.' },
  weaker: { en: 'The US dollar is weaker.', de: 'Der US-Dollar ist schwächer.' },
};
