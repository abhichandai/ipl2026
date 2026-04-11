const CRICAPI_KEY = process.env.CRICAPI_KEY!;
const BASE = 'https://api.cricapi.com/v1';
const CACHE_HOURS = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PointsTableEntry {
  team: string;
  shortname: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  nrr: string;
}

export interface CapEntry {
  rank: number;
  player: string;
  team: string;
  value: number; // runs or wickets
}

export interface CricketStats {
  pointsTable: PointsTableEntry[];
  orangeCap: CapEntry[];
  purpleCap: CapEntry[];
  batters: string[];   // for prediction dropdowns
  bowlers: string[];
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAPI(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ apikey: CRICAPI_KEY, ...params });
  const url = `${BASE}/${endpoint}?${qs}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`CricAPI ${endpoint} returned ${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(`CricAPI error: ${json.reason || json.status}`);
  return json;
}

// ─── Step 1: Find IPL 2026 series ID ─────────────────────────────────────────

async function findIPL2026SeriesId(): Promise<string> {
  // Try searching for IPL 2026
  const data = await fetchAPI('series', { search: 'Indian Premier League 2026', offset: '0' });
  const series = data.data as any[];
  const ipl = series?.find((s: any) =>
    s.name?.toLowerCase().includes('indian premier league') &&
    s.name?.includes('2026')
  );
  if (ipl?.id) return ipl.id;

  // Fallback: try just "IPL 2026"
  const data2 = await fetchAPI('series', { search: 'IPL 2026', offset: '0' });
  const series2 = data2.data as any[];
  const ipl2 = series2?.find((s: any) =>
    s.name?.toLowerCase().includes('ipl') && s.name?.includes('2026')
  );
  if (ipl2?.id) return ipl2.id;

  throw new Error('IPL 2026 series not found');
}

// ─── Step 2: Get series info (squads + standings) ────────────────────────────

async function getSeriesInfo(seriesId: string) {
  return fetchAPI('series_info', { id: seriesId });
}

// ─── Step 3: Get match list to aggregate batting/bowling stats ───────────────

async function getSeriesMatches(seriesId: string) {
  return fetchAPI('matches', { series_id: seriesId, offset: '0' });
}

// ─── Main: Build full stats object ───────────────────────────────────────────

export async function fetchLiveIPLStats(): Promise<CricketStats> {
  const seriesId = await findIPL2026SeriesId();
  const [seriesInfo, matchData] = await Promise.all([
    getSeriesInfo(seriesId),
    getSeriesMatches(seriesId).catch(() => ({ data: [] })),
  ]);

  // --- Points Table ---
  const pointsTable: PointsTableEntry[] = [];
  const standings = seriesInfo.data?.pointsTable?.[0]?.pointsTableRows ||
                    seriesInfo.data?.standings ||
                    [];
  for (const row of standings) {
    pointsTable.push({
      team: row.teamName || row.team?.name || '',
      shortname: row.teamSName || row.team?.shortname || '',
      played: Number(row.matchesPlayed ?? row.played ?? 0),
      won: Number(row.matchesWon ?? row.won ?? 0),
      lost: Number(row.matchesLost ?? row.lost ?? 0),
      points: Number(row.points ?? 0),
      nrr: String(row.nrr ?? row.netRunRate ?? '0.000'),
    });
  }

  // --- Squad / Player lists ---
  const batters = new Set<string>();
  const bowlers = new Set<string>();
  const squads = seriesInfo.data?.squads || [];

  for (const squad of squads) {
    for (const player of squad.players || []) {
      const name = player.name;
      const role = (player.playerType || player.role || '').toLowerCase();
      if (role.includes('bat') || role.includes('wk') || role.includes('allrounder') || role.includes('all-rounder')) {
        batters.add(name);
      }
      if (role.includes('bowl') || role.includes('allrounder') || role.includes('all-rounder')) {
        bowlers.add(name);
      }
      // If no role info, add to both
      if (!role) { batters.add(name); bowlers.add(name); }
    }
  }

  // --- Orange / Purple Cap from match scorecards ---
  // Aggregate runs and wickets across all completed matches
  const runMap: Record<string, { runs: number; team: string }> = {};
  const wicketMap: Record<string, { wickets: number; team: string }> = {};

  for (const match of (matchData.data || []).slice(0, 30)) {
    if (!match.score || match.matchEnded === false) continue;
    // Try to get scorecard for each completed match (costs API calls, limit to 10)
    try {
      const sc = await fetchAPI('match_scorecard', { id: match.id });
      for (const inning of sc.data?.scorecard || []) {
        for (const batter of inning.batting || []) {
          const name = batter.batsman?.name || batter.name;
          const runs = Number(batter.r ?? batter.runs ?? 0);
          const team = inning.batting?.[0]?.batsman?.teamName || '';
          if (name && runs > 0) {
            if (!runMap[name]) runMap[name] = { runs: 0, team };
            runMap[name].runs += runs;
          }
        }
        for (const bowler of inning.bowling || []) {
          const name = bowler.bowler?.name || bowler.name;
          const wkts = Number(bowler.w ?? bowler.wickets ?? 0);
          const team = inning.bowling?.[0]?.bowler?.teamName || '';
          if (name && wkts > 0) {
            if (!wicketMap[name]) wicketMap[name] = { wickets: 0, team };
            wicketMap[name].wickets += wkts;
          }
        }
      }
    } catch { /* skip */ }
  }

  const orangeCap: CapEntry[] = Object.entries(runMap)
    .sort((a, b) => b[1].runs - a[1].runs)
    .slice(0, 10)
    .map(([player, d], i) => ({ rank: i + 1, player, team: d.team, value: d.runs }));

  const purpleCap: CapEntry[] = Object.entries(wicketMap)
    .sort((a, b) => b[1].wickets - a[1].wickets)
    .slice(0, 10)
    .map(([player, d], i) => ({ rank: i + 1, player, team: d.team, value: d.wickets }));

  return {
    pointsTable: pointsTable.sort((a, b) => b.points - a.points || Number(b.nrr) - Number(a.nrr)),
    orangeCap,
    purpleCap,
    batters: Array.from(batters).sort(),
    bowlers: Array.from(bowlers).sort(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Cache helpers (used by API route) ───────────────────────────────────────

export function isCacheStale(updatedAt: string): boolean {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > CACHE_HOURS * 60 * 60 * 1000;
}
