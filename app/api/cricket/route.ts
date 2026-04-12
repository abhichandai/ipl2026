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

    // Force refresh from admin
    if (forceRefresh && isAdmin) {
      const stats = await doRefresh();
      return NextResponse.json({ ...stats, fromCache: false });
    }

    // No cache yet — fetch fresh
    if (rows.length === 0) {
      const stats = await doRefresh();
      return NextResponse.json({ ...stats, fromCache: false });
    }

    const stale = isCacheStale(rows[0].updated_at.toISOString());

    // Cache is stale — refresh now (lazy auto-refresh)
    if (stale) {
      try {
        const stats = await doRefresh();
        return NextResponse.json({ ...stats, fromCache: false, wasStale: true });
      } catch (refreshErr: any) {
        // Refresh failed — return stale cache rather than error
        return NextResponse.json({
          ...rows[0].data,
          updatedAt: rows[0].updated_at,
          stale: true,
          fromCache: true,
          error: refreshErr.message,
        });
      }
    }

    // Cache is fresh — return it
    return NextResponse.json({
      ...rows[0].data,
      updatedAt: rows[0].updated_at,
      stale: false,
      fromCache: true,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
