/* The market temperature: the ONE copy of the scoring rules.
 *
 * Plain ES5 on purpose, so the same file runs everywhere without a build step:
 *   - the server and emails, through lib/signal.ts (typed wrapper)
 *   - the homepage, where lib/home-html.ts pastes this file into app.html's SIGNAL MODEL block
 *   - the X bot, which reads the result from /api/signal
 *
 * Each reading leans cold (+), sits in the middle (0) or leans hot (−); every reading has a
 * neutral middle band. A 24h move of 5% or more tips it one step (down = colder, up = hotter).
 * Total −6…+6: Cold at +3 or more, Hot at −3 or less, Mild in between (symmetric).
 */
var WTB_BANDS = { maDeepBelow: -10, maNear: 5, maFarAbove: 20, athDeep: -50, athNear: -20, move: 5, scoreMax: 6 };

/* Bands follow the index publisher's own label when there is one, so our wording never
   contradicts the label shown next to the number. Numeric fallback = Alternative.me bands. */
function wtbFgBand(v, cls) {
  var m = { 'extreme fear': 'extreme-fear', 'fear': 'fear', 'neutral': 'neutral', 'greed': 'greed', 'extreme greed': 'extreme-greed' };
  var k = cls ? m[String(cls).trim().toLowerCase()] : null;
  if (k) return k;
  return v < 25 ? 'extreme-fear' : v < 47 ? 'fear' : v < 55 ? 'neutral' : v < 76 ? 'greed' : 'extreme-greed';
}
function wtbFgScore(v, cls) {
  return { 'extreme-fear': 2, 'fear': 1, 'neutral': 0, 'greed': -1, 'extreme-greed': -2 }[wtbFgBand(v, cls)];
}
/* Price vs its 200-day average, in %. Within ±5% counts as "at the average". */
function wtbMaScore(pct) {
  var b = WTB_BANDS;
  return pct < b.maDeepBelow ? 2 : pct < -b.maNear ? 1 : pct <= b.maNear ? 0 : pct <= b.maFarAbove ? -1 : -2;
}
/* Distance from the all-time high, in % (0 or above = at a new high). */
function wtbAthScore(pct) {
  return pct < WTB_BANDS.athDeep ? 1 : pct < WTB_BANDS.athNear ? 0 : -1;
}
/* The last 24 hours, in %. A move of 5% or more either way tips the temperature one step. */
function wtbMoveScore(change24h) {
  if (change24h == null || !isFinite(change24h)) return 0;
  return change24h <= -WTB_BANDS.move ? 1 : change24h >= WTB_BANDS.move ? -1 : 0;
}
function wtbStateFromScore(score) {
  return score >= 3 ? 'accumulate' : score <= -3 ? 'caution' : 'hold';
}
function wtbSignal(fgValue, fgClass, maPct, athPct, change24h) {
  var fg = wtbFgScore(fgValue, fgClass), ma = wtbMaScore(maPct), ath = wtbAthScore(athPct), move = wtbMoveScore(change24h);
  var score = fg + ma + ath + move;
  return { score: score, state: wtbStateFromScore(score), parts: { fg: fg, ma: ma, ath: ath, move: move } };
}
/* Marker position on the Cold–Mild–Hot bar (0 = cold end, 1 = hot end). Each state owns
   exactly one third, so the marker can never sit in a zone that disagrees with the word. */
function wtbScalePos(score) {
  var max = WTB_BANDS.scoreMax;
  var s = Math.max(-max, Math.min(max, Math.round(score)));
  if (s >= 3) return ((max - s + 0.5) / (max - 2)) / 3;
  if (s <= -3) return 2 / 3 + ((-s - 3 + 0.5) / (max - 2)) / 3;
  return 1 / 3 + ((2 - s + 0.5) / 5) / 3;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WTB_BANDS: WTB_BANDS, wtbFgBand: wtbFgBand, wtbFgScore: wtbFgScore, wtbMaScore: wtbMaScore, wtbAthScore: wtbAthScore,
    wtbMoveScore: wtbMoveScore, wtbStateFromScore: wtbStateFromScore, wtbSignal: wtbSignal, wtbScalePos: wtbScalePos };
}
