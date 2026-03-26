export default async function handler(req, res) {
  try {
    // Login to get auth token
    const loginRes = await fetch('https://umami-orange.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: process.env.UMAMI_PASSWORD,
      }),
    });
    const { token } = await loginRes.json();

    // Fetch lifetime stats
    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=1000000000000&endAt=${Date.now()}`,
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
