// Run: npx tsx --test tests/home-html.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { buildHomeHtml, englishFaq } from '../lib/home-html';

const raw = readFileSync('public/app.html', 'utf8');

test('homepage: English FAQ is extracted from app.html translations', () => {
  const faq = englishFaq(raw);
  assert.ok(faq.length >= 5, 'expected the English FAQ items, got ' + faq.length);
  assert.ok(faq.every((f) => f.q && f.a));
});

test('homepage: FAQ is server-rendered and has FAQPage schema', () => {
  const html = buildHomeHtml(raw);
  assert.ok(!html.includes('<!-- Items injected by JS from translations -->'), 'FAQ placeholder still empty');
  assert.ok(html.includes('id="faq-answer-0"'));
  const ld = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) => JSON.parse(m[1]));
  const faqLd = ld.find((j) => j['@type'] === 'FAQPage');
  assert.ok(faqLd && faqLd.mainEntity.length === englishFaq(raw).length);
  assert.ok(!/<[a-z]/i.test(JSON.stringify(faqLd)), 'schema answers must be plain text');
});

test('homepage: a failed live refresh never replaces numbers already on screen', () => {
  const fn = raw.slice(raw.indexOf('async function fetchPrice()'), raw.indexOf('function applyPrice(data)'));
  assert.ok(/if \(!res\.ok\) throw/.test(fn), 'fetchPrice must reject a non-200 answer');
  assert.ok(/typeof currentPrice === 'number' && isFinite\(currentPrice\)\) return;/.test(fn), 'fetchPrice must keep the last good price');
  assert.ok(raw.includes(".every(v => typeof v === 'number' && isFinite(v))) return;"), 'updateSignal must not score half-loaded numbers');
  for (const l of ['emailTooMany: \'Too many', 'emailTooMany: \'Zu viele']) assert.ok(raw.includes(l), 'rate-limit message missing: ' + l);
});
