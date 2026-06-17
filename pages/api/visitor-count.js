export default async function handler(req, res) {
  try {
    const loginRes = await fetch('https://umami-orange.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'imobbcs',
        password: process.env.UMAMI_PASSWORD,
      }),
    });

    if (!loginRes.ok) {
      console.error('visitor-count: Umami login failed', loginRes.status, await loginRes.text());
      return res.status(200).json({ visitors: null });
    }

    const loginData = await loginRes.json();
    const token = loginData?.token;

    if (!token) {
      console.error('visitor-count: No token in login response', JSON.stringify(loginData));
      return res.status(200).json({ visitors: null });
    }

    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=1000000000000&endAt=${Date.now()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!statsRes.ok) {
      console.error('visitor-count: Umami stats failed', statsRes.status, await statsRes.text());
      return res.status(200).json({ visitors: null });
    }

    const stats = await statsRes.json();
    console.log('visitor-count: stats response', JSON.stringify(stats));

    const visitors = stats?.visitors?.value ?? null;
    console.log('visitor-count: visitors value', visitors);
    return res.status(200).json({ visitors });

  } catch (e) {
    console.error('visitor-count: exception', e.message);
    return res.status(500).json({ visitors: null });
  }
}
