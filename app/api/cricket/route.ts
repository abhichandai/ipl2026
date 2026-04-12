import { NextRequest, NextResponse } from 'next/server';
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
  const existing = await db`SELECT id FROM cricket_cache LIMIT 1`;
  if (existing.length > 0) {
    await db`UPDATE cricket_cache SET data = ${JSON.stringify(stats)}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await db`INSERT INTO cricket_cache (data) VALUES (${JSON.stringify(stats)})`;
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

    // Admin force refresh — do it synchronously and return fresh
    if (forceRefresh && isAdmin) {
      const stats = await doRefresh();
      return NextResponse.json({ ...stats, fromCache: false });
    }

    // No cache — fetch fresh synchronously (first run)
    if (rows.length === 0) {
      const stats = await doRefresh();
      return NextResponse.json({ ...stats, fromCache: false });
    }

    const stale = isCacheStale(rows[0].updated_at.toISOString());

    // Cache is stale — return stale data immediately, refresh in background
    if (stale) {
      // Fire-and-forget background refresh (won't block the response)
      doRefresh().catch(() => {});
    }

    // Return whatever we have (stale or fresh)
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
