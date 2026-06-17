export default async function handler(req, res) {
  console.log('visitor-count: handler called');
  try {
    console.log('visitor-count: attempting Umami login');
    const loginRes = await fetch('https://umami-orange.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'imobbcs',
        password: process.env.UMAMI_PASSWORD,
      }),
      signal: AbortSignal.timeout(8000),
    });

    console.log('visitor-count: login status', loginRes.status);
    const loginData = await loginRes.json();
    console.log('visitor-count: login response', JSON.stringify(loginData));
    const token = loginData?.token;

    if (!token) {
      console.error('visitor-count: no token received');
      return res.status(200).json({ visitors: null });
    }

    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=1000000000000&endAt=${Date.now()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    console.log('visitor-count: stats status', statsRes.status);
    const stats = await statsRes.json();
    console.log('visitor-count: stats response', JSON.stringify(stats));

    const visitors = stats?.visitors ?? null;
    console.log('visitor-count: final visitors value', visitors);

    return res.status(200).json({ visitors });

  } catch (e) {
    console.error('visitor-count: exception caught', e.name, e.message);
    return res.status(200).json({ visitors: null });
  }
}
