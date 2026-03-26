export default async function handler(req, res) {
  try {
    // Step 1: get share token
    const shareRes = await fetch('https://umami-orange.up.railway.app/api/share/HABY6nopc9PYf1m9');
    const { token } = await shareRes.json();

    // Step 2: fetch lifetime stats (startAt=0 gets all time)
    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=0&endAt=${Date.now()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const stats = await statsRes.json();

    const visitors = stats?.visitors?.value ?? null;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ visitors });
  } catch (e) {
    res.status(500).json({ visitors: null });
  }
}
