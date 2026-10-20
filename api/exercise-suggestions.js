export default async function handler(request, response) {
  const query = new URL(request.url, 'http://localhost').searchParams;
  const limit = Math.min(Number(query.get('limit')) || 100, 200);
  const source = `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=${limit}`;

  try {
    const upstream = await fetch(source, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) return response.status(upstream.status).json({ error: 'Fonte web indisponível' });
    const payload = await upstream.json();
    const results = (payload.results || []).map(item => ({
      name: item.name,
      type: 'Web',
      group: item.category?.name || 'Exercício sugerido',
      muscles: (item.muscles || []).map(muscle => muscle.name_en || muscle.name).filter(Boolean),
      equipment: (item.equipment || []).map(item => item.name).filter(Boolean),
      instructions: String(item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280)
    })).filter(item => item.name);
    response.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return response.status(200).json({ source: 'wger', results });
  } catch (error) {
    return response.status(502).json({ error: 'Não foi possível consultar sugestões online' });
  }
}
