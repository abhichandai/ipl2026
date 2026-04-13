const CRICAPI_KEY = process.env.CRICAPI_KEY!;
const BASE = 'https://api.cricapi.com/v1';
const CACHE_HOURS = 1;

async function fetchAPI(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ apikey: CRICAPI_KEY, ...params });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`CricAPI ${endpoint} returned ${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(`CricAPI: ${json.reason || json.status}`);
  return json;
}

// Get IPL 2026 squad player lists for prediction dropdowns
export async function fetchIPLSquads(): Promise<{ batters: string[]; bowlers: string[] }> {
  // Find IPL 2026 series
  const search = await fetchAPI('series', { search: 'Indian Premier League 2026', offset: '0' });
  const series = (search.data as any[])?.find((s: any) =>
    s.name?.toLowerCase().includes('indian premier league') && s.name?.includes('2026')
  );
  if (!series?.id) throw new Error('IPL 2026 series not found');

  const info = await fetchAPI('series_info', { id: series.id });
  const batters = new Set<string>();
  const bowlers = new Set<string>();

  for (const squad of info.data?.squads || []) {
    for (const player of squad.players || []) {
      const role = (player.playerType || player.role || '').toLowerCase();
      if (!role || role.includes('bat') || role.includes('wk') || role.includes('all')) {
        batters.add(player.name);
      }
      if (!role || role.includes('bowl') || role.includes('all')) {
        bowlers.add(player.name);
      }
    }
  }

  return {
    batters: Array.from(batters).sort(),
    bowlers: Array.from(bowlers).sort(),
  };
}

export function isCacheStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > CACHE_HOURS * 60 * 60 * 1000;
}
