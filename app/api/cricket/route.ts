import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { scrapeIPLStats } from '@/lib/scrape';
import { isCacheStale } from '@/lib/cricket';

export const maxDuration = 60;

async function ensureTable() {
  const db = getDB();
  await db`
    CREATE TABLE IF NOT EXISTS cricket_cache (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';
  const isAdmin = req.nextUrl.searchParams.get('key') === process.env.ADMIN_PASSWORD;

  // Only allow forced refresh from admin
  if (forceRefresh && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTable();
    const db = getDB();

    // Return cache unless forced refresh
    if (!forceRefresh) {
      const rows = await db`SELECT data, updated_at FROM cricket_cache ORDER BY id DESC LIMIT 1`;
      if (rows.length > 0) {
        const stale = isCacheStale(rows[0].updated_at.toISOString());
        return NextResponse.json({
          ...rows[0].data,
          updatedAt: rows[0].updated_at,
          stale,
          fromCache: true,
        });
      }
    }

    // Scrape fresh data
    const stats = await scrapeIPLStats();

    // Upsert
    const existing = await db`SELECT id FROM cricket_cache LIMIT 1`;
    if (existing.length > 0) {
      await db`UPDATE cricket_cache SET data = ${JSON.stringify(stats)}, updated_at = NOW() WHERE id = ${existing[0].id}`;
    } else {
      await db`INSERT INTO cricket_cache (data) VALUES (${JSON.stringify(stats)})`;
    }

    // Sync scraped rankings into live_data so scoring engine picks them up
    const db2 = getDB();
    const liveRows = await db2`SELECT id FROM live_data LIMIT 1`;
    if (liveRows.length > 0 && stats.orangeCap?.length && stats.purpleCap?.length) {
      const orangeNames = stats.orangeCap.map((r: any) => r.player);
      const purpleNames = stats.purpleCap.map((r: any) => r.player);
      const top4Names = stats.pointsTable?.slice(0, 4).map((r: any) => r.shortname || r.team) || [];
      await db2`
        UPDATE live_data SET
          orange_cap_rankings = ${JSON.stringify(orangeNames)},
          purple_cap_rankings = ${JSON.stringify(purpleNames)},
          top4_teams = CASE WHEN ${top4Names.length} > 0 THEN ${JSON.stringify(top4Names)}::jsonb ELSE top4_teams END,
          updated_at = NOW()
        WHERE id = ${liveRows[0].id}
      `;
    }

    return NextResponse.json({ ...stats, fromCache: false });
  } catch (err: any) {
    // Return stale cache on error rather than failing
    try {
      const db = getDB();
      const rows = await db`SELECT data, updated_at FROM cricket_cache ORDER BY id DESC LIMIT 1`;
      if (rows.length > 0) {
        return NextResponse.json({
          ...rows[0].data,
          updatedAt: rows[0].updated_at,
          stale: true,
          fromCache: true,
          error: err.message,
        });
      }
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
