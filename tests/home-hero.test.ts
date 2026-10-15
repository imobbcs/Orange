// Run: npx tsx --test tests/home-hero.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { readTranslations, renderHero, type HeroSnapshot } from '../lib/home-hero';
import { buildHomeHtml } from '../lib/home-html';

const raw = readFileSync('public/app.html', 'utf8');
const html = buildHomeHtml(raw);
const tr = readTranslations(raw)!;
const snap: HeroSnapshot = { price: 73315, priceUsd: 81673, change24h: -1.31, fg: 48, fgLabel: 'Neutral', ma200: 67986.77, athEur: 107662 };
const text = (h: string, id: string) => (h.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</`)) || [])[1];

test('home hero: translations are readable from app.html', () => {
  assert.ok(tr, 'translations block could not be evaluated');
  for (const l of ['en', 'de'] as const) {
    for (const k of ['stateName', 'signalHold', 'signalAccumulate', 'signalAccumulateDump', 'signalCaution', 'signalCautionHot', 'heroAbove', 'heroBelow', 'heroDiscount']) {
      assert.ok(tr[l][k], `${l}.${k} missing`);
    }
  }
});

test('home hero: every element the hero fills still exists in app.html', () => {
  for (const id of ['price-value', 'price-change', 'hero-price', 'hero-state', 'hero-sentence', 'hs-cold', 'hs-mild', 'hs-hot', 'hero-scale', 'hero-scale-marker',
    'hero-why-btn', 'hero-fg-value', 'hero-fg-state', 'hero-ma-value', 'hero-ma-state', 'hero-ath-value', 'hero-ath-state']) {
    assert.ok(html.includes(`id="${id}"`), `#${id} missing from app.html`);
  }
  assert.ok(raw.includes('function seedFromServer()') && raw.includes('window.__WTB_SNAPSHOT'), 'browser seeding block missing');
  for (const f of ['applyPrice', 'applyFearGreed', 'applyATH', 'applyMA']) assert.ok(raw.includes(`function ${f}(data)`), f + ' missing');
});

test('home hero: English render matches the browser formatting', () => {
  const out = renderHero(html, snap, 'en', tr, Date.UTC(2026, 9, 15));
  assert.match(out, /<html lang="en" data-temp="mild"/);
  assert.equal(text(out, 'price-value'), '73,315');
  assert.equal(text(out, 'price-change'), '−1.31% · −€973 today');
  assert.equal(text(out, 'hero-state'), 'Mild.');
  assert.ok(tr.en.signalHold.includes(text(out, 'hero-sentence')));
  assert.equal(text(out, 'hero-why-btn'), 'Why mild?');
  assert.equal(text(out, 'hero-fg-value'), '48');
  assert.equal(text(out, 'hero-ma-value'), '+7.8%');
  assert.equal(text(out, 'hero-ath-value'), '−31.9%');
  assert.match(out, /id="hs-mild" class="on"/);
  assert.match(out, /window\.__WTB_SNAPSHOT=\{"price":73315/);
});

test('home hero: German render and states', () => {
  const de = renderHero(html, snap, 'de', tr);
  assert.match(de, /<html lang="de" data-temp="mild"/);
  assert.equal(text(de, 'price-value'), '73.315');
  assert.equal(text(de, 'hero-ma-value'), '+7,8%');
  assert.equal(text(de, 'hero-why-btn'), 'Warum mild?');
  const cold = renderHero(html, { ...snap, fg: 10, fgLabel: 'Extreme Fear', ma200: 90000 }, 'en', tr);
  assert.match(cold, /data-temp="cold"/);
  assert.equal(text(cold, 'hero-state'), 'Cold.');
  const ath = renderHero(html, { ...snap, athEur: 70000 }, 'en', tr);
  assert.equal(text(ath, 'hero-ath-state'), 'New high');
});

test('home hero: snapshot cannot break out of its script tag', () => {
  const out = renderHero(html, { ...snap, fgLabel: '</script><script>alert(1)</script>' }, 'en', tr);
  assert.ok(!out.includes('</script><script>alert(1)'));
});
