// Article mapping across languages by topic
export const articleMappings = {
  'fear-greed-index': {
    en: 'fear-greed-index',
    fr: 'indice-peur-cupidite',
    de: 'fear-greed-index-verstehen',
    it: 'indice-fear-greed'
  },
  'bitcoin-beginners-mistakes': {
    en: 'bitcoin-investment-guide-beginners',
    fr: 'erreurs-bitcoin-debutants',
    de: 'bitcoin-anfaenger-fehler',
    it: 'bitcoin-errori-principianti'
  },
  'bitcoin-volatility': {
    en: 'bitcoin-volatility-explained',
    fr: 'volatilite-bitcoin-expliquee',
    de: 'bitcoin-volatilitaet-erklaert',
    it: 'bitcoin-volatilita-spiegata'
  },
  'bitcoin-investment-strategy': {
    en: 'bitcoin-investment-dca-vs-lump',
    fr: 'plan-investissement-bitcoin',
    de: 'bitcoin-investmentplan',
    it: 'bitcoin-dca-vs-acquisto-unico'
  },
  'bitcoin-vs-altcoins': {
    en: 'bitcoin-vs-altcoins',
    fr: 'bitcoin-vs-altcoins',
    de: 'bitcoin-vs-altcoins',
    it: 'bitcoin-vs-altcoin'
  },
  'bitcoin-halving': {
    en: 'bitcoin-halving-explained',
    fr: 'bitcoin-halving-explique',
    de: 'bitcoin-halving-erklaert',
    it: 'bitcoin-halving-spiegato'
  },
  'bitcoin-myths': {
    en: 'bitcoin-myths-busted',
    fr: 'mythes-bitcoin-demystifies',
    de: 'bitcoin-mythen-entzaubert',
    it: 'miti-bitcoin-sfatare'
  },
  'when-to-buy-bitcoin': {
    en: 'when-to-buy-bitcoin',
    fr: 'quand-acheter-bitcoin',
    de: 'wann-bitcoin-kaufen',
    it: 'quando-comprare-bitcoin'
  }
};

export function findEquivalentArticle(currentSlug: string, targetLocale: string): string | null {
  // Find which topic this slug belongs to
  for (const [topic, slugs] of Object.entries(articleMappings)) {
    // Check if current slug exists in any language for this topic
    const foundInLanguage = Object.values(slugs).includes(currentSlug);
    if (foundInLanguage) {
      // Return the equivalent slug in target language
      return slugs[targetLocale as keyof typeof slugs] || null;
    }
  }
  return null;
}