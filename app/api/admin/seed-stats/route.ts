import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const CURRENT_STATS = {
  pointsTable: [
    { team: 'PBKS', played: 7, won: 6, lost: 0, points: 13, nrr: '+1.333' },
    { team: 'RCB',  played: 7, won: 5, lost: 2, points: 10, nrr: '+1.101' },
    { team: 'SRH',  played: 8, won: 5, lost: 3, points: 10, nrr: '+0.815' },
    { team: 'RR',   played: 8, won: 5, lost: 3, points: 10, nrr: '+0.602' },
    { team: 'GT',   played: 8, won: 4, lost: 4, points:  8, nrr: '-0.475' },
    { team: 'CSK',  played: 8, won: 3, lost: 5, points:  6, nrr: '-0.121' },
    { team: 'DC',   played: 7, won: 3, lost: 4, points:  6, nrr: '-0.184' },
    { team: 'KKR',  played: 8, won: 2, lost: 5, points:  5, nrr: '-0.751' },
    { team: 'MI',   played: 7, won: 2, lost: 5, points:  4, nrr: '-0.736' },
    { team: 'LSG',  played: 8, won: 2, lost: 6, points:  4, nrr: '-1.106' },
  ],
  orangeCap: [
    { rank: 1,  player: 'Abhishek Sharma',   team: 'SRH',  runs: 380 },
    { rank: 2,  player: 'V Sooryavanshi',    team: 'RR',   runs: 357 },
    { rank: 3,  player: 'KL Rahul',          team: 'DC',   runs: 357 },
    { rank: 4,  player: 'H Klaasen',         team: 'SRH',  runs: 349 },
    { rank: 5,  player: 'Shubman Gill',      team: 'GT',   runs: 330 },
    { rank: 6,  player: 'V Kohli',           team: 'RCB',  runs: 328 },
    { rank: 7,  player: 'B Sai Sudharsan',   team: 'GT',   runs: 322 },
    { rank: 8,  player: 'Ishan Kishan',      team: 'SRH',  runs: 312 },
    { rank: 9,  player: 'SV Samson',         team: 'CSK',  runs: 304 },
    { rank: 10, player: 'Prabhsimran Singh', team: 'PBKS', runs: 287 },
  ],
  purpleCap: [
    { rank: 1,  player: 'A Kamboj',          team: 'CSK',  wickets: 14 },
    { rank: 2,  player: 'E Malinga',         team: 'SRH',  wickets: 14 },
    { rank: 3,  player: 'JC Archer',         team: 'RR',   wickets: 13 },
    { rank: 4,  player: 'Prince Yadav',      team: 'LSG',  wickets: 13 },
    { rank: 5,  player: 'K Rabada',          team: 'GT',   wickets: 13 },
    { rank: 6,  player: 'M Prasidh Krishna', team: 'GT',   wickets: 12 },
    { rank: 7,  player: 'B Kumar',           team: 'RCB',  wickets: 11 },
    { rank: 8,  player: 'Ravi Bishnoi',      team: 'RR',   wickets: 11 },
    { rank: 9,  player: 'Mohsin Khan',       team: 'LSG',  wickets:  9 },
    { rank: 10, player: 'Kartik Tyagi',      team: 'KKR',  wickets:  9 },
  ],
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  const isAdmin = req.nextUrl.searchParams.get('key') === process.env.ADMIN_PASSWORD;
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB();

  const existing = await db`SELECT id FROM cricket_cache LIMIT 1`;
  if (existing.length > 0) {
    await db`UPDATE cricket_cache SET data = ${JSON.stringify(CURRENT_STATS)}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await db`INSERT INTO cricket_cache (data) VALUES (${JSON.stringify(CURRENT_STATS)})`;
  }

  const orangeRankings = CURRENT_STATS.orangeCap.map(r => r.player);
  const purpleRankings = CURRENT_STATS.purpleCap.map(r => r.player);
  const top4Teams = CURRENT_STATS.pointsTable.slice(0, 4).map(r => r.team);

  const liveRows = await db`SELECT id FROM live_data LIMIT 1`;
  if (liveRows.length > 0) {
    await db`UPDATE live_data SET
      orange_cap_rankings = ${JSON.stringify(orangeRankings)},
      purple_cap_rankings = ${JSON.stringify(purpleRankings)},
      top4_teams = ${JSON.stringify(top4Teams)},
      updated_at = NOW()
    WHERE id = ${liveRows[0].id}`;
  }

  return NextResponse.json({ success: true, batters: 10, bowlers: 10, teams: 10, top4: top4Teams });
}
