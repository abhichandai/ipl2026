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
