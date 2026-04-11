import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { fetchIPLSquads, isCacheStale } from '@/lib/cricket';

export const maxDuration = 30;

async function ensureTable() {
  const db = getDB();
  await db`CREATE TABLE IF NOT EXISTS player_cache (
    id SERIAL PRIMARY KEY,
    batters JSONB DEFAULT '[]',
    bowlers JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    await ensureTable();
    const db = getDB();

    // Return cache if fresh (24hr TTL for squads — they barely change)
    const rows = await db`SELECT * FROM player_cache LIMIT 1`;
    if (rows.length > 0) {
      const stale = Date.now() - new Date(rows[0].updated_at).getTime() > 24 * 60 * 60 * 1000;
      if (!stale) return NextResponse.json({ batters: rows[0].batters, bowlers: rows[0].bowlers, fromCache: true });
    }

    // Fetch fresh from CricAPI
    const { batters, bowlers } = await fetchIPLSquads();
    if (rows.length > 0) {
      await db`UPDATE player_cache SET batters=${JSON.stringify(batters)}, bowlers=${JSON.stringify(bowlers)}, updated_at=NOW() WHERE id=${rows[0].id}`;
    } else {
      await db`INSERT INTO player_cache (batters, bowlers) VALUES (${JSON.stringify(batters)}, ${JSON.stringify(bowlers)})`;
    }
    return NextResponse.json({ batters, bowlers, fromCache: false });
  } catch (err: any) {
    // Return stale cache on failure
    try {
      const rows = await getDB()`SELECT * FROM player_cache LIMIT 1`;
      if (rows.length > 0) return NextResponse.json({ batters: rows[0].batters, bowlers: rows[0].bowlers, fromCache: true, stale: true });
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
