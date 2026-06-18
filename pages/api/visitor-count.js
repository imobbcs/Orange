export default async function handler(req, res) {
  try {
    const loginRes = await fetch('https://umami-orange.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'imobbcs',
        password: process.env.UMAMI_PASSWORD,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      return res.status(200).json({ visitors: null, debug: 'login_failed', loginStatus: loginRes.status, loginData });
    }
    const statsRes = await fetch(
      `https://umami-orange.up.railway.app/api/websites/c884bf96-c757-4dfb-b2bb-8195d5876958/stats?startAt=1000000000000&endAt=${Date.now()}`,
      { headers: { Authorization: `Bearer ${loginData.token}` }, signal: AbortSignal.timeout(8000) }
    );
    const stats = await statsRes.json();
    return res.status(200).json({ visitors: stats?.visitors?.value ?? null, debug: 'ok', stats });
  } catch (e) {
    return res.status(200).json({ visitors: null, debug: 'exception', error: e.message });
  }
}
