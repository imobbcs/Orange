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
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faqLd = ld.find((j) => j['@type'] === 'FAQPage');
  assert.ok(faqLd && faqLd.mainEntity.length === englishFaq(raw).length);
  assert.ok(!/<[a-z]/i.test(JSON.stringify(faqLd)), 'schema answers must be plain text');
});
