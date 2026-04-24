import { NextRequest, NextResponse, after } from 'next/server';
import { getDB } from '@/lib/db';
import { scrapeIPLStats } from '@/lib/scrape';
import { isCacheStale } from '@/lib/cricket';

export const maxDuration = 60;

async function ensureTable() {
  const db = getDB();
  await db`CREATE TABLE IF NOT EXISTS cricket_cache (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

async function doRefresh() {
  const db = getDB();
  const stats = await scrapeIPLStats();

  // 1. Update cricket_cache (sidebar display)
  const existing = await db`SELECT id FROM cricket_cache LIMIT 1`;
  if (existing.length > 0) {
    await db`UPDATE cricket_cache SET data = ${JSON.stringify(stats)}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await db`INSERT INTO cricket_cache (data) VALUES (${JSON.stringify(stats)})`;
  }

  // 2. Sync scraped rankings into live_data so scoring uses fresh data immediately.
  //    We only overwrite rankings — never tournament_winner (admin sets that manually).
  const orangeRankings = [...(stats.orangeCap || [])]
    .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((r: any) => r.player);
  const purpleRankings = [...(stats.purpleCap || [])]
    .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((r: any) => r.player);
  const top4Teams = [...(stats.pointsTable || [])]
    .sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 4)
    .map((r: any) => r.shortname || r.team);

  const liveRows = await db`SELECT id FROM live_data LIMIT 1`;
  if (liveRows.length > 0) {
    await db`
      UPDATE live_data SET
        orange_cap_rankings = ${JSON.stringify(orangeRankings)},
        purple_cap_rankings = ${JSON.stringify(purpleRankings)},
        top4_teams          = ${JSON.stringify(top4Teams)},
        updated_at          = NOW()
      WHERE id = ${liveRows[0].id}
    `;
  }

  return stats;
}

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';
  const isAdmin = req.nextUrl.searchParams.get('key') === process.env.ADMIN_PASSWORD;

  if (forceRefresh && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTable();
    const db = getDB();
    const rows = await db`SELECT data, updated_at FROM cricket_cache ORDER BY id DESC LIMIT 1`;

    // Admin force refresh — fire and forget via after(). UI polls for completion via updatedAt.
    if (forceRefresh && isAdmin) {
      after(doRefresh().catch((err: any) => {
        console.error('[doRefresh] FAILED:', err?.message || err);
      }));
      return NextResponse.json({ started: true, startedAt: new Date().toISOString() });
    }

    // No cache — fetch fresh synchronously (first run only)
    if (rows.length === 0) {
      const stats = await doRefresh();
      return NextResponse.json({ ...stats, fromCache: false });
    }

    const stale = isCacheStale(rows[0].updated_at.toISOString());

    return NextResponse.json({
      ...rows[0].data,
      updatedAt: rows[0].updated_at,
      stale,
      fromCache: true,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
