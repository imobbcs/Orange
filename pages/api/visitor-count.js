export default async function handler(req, res) {
  try {
    const shareRes = await fetch('https://umami-orange.up.railway.app/api/share/HABY6nopc9PYf1m9');
    const { token } = await shareRes.json();

    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=1000000000000&endAt=${Date.now()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const stats = await statsRes.json();

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
