import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// One-shot route to fix name mismatches introduced by Haiku screenshot misreads.
// DELETE this file once confirmed fixed.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB();
  const rows = await db`SELECT id, orange_cap_rankings, purple_cap_rankings FROM live_data LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: 'No live_data row' });

  const row = rows[0];

  // Fix known Haiku misreads — map wrong name → canonical name
  const NAME_FIXES: Record<string, string> = {
    'V Sooryanshi': 'V Sooryavanshi',
    'Vaibhav Suryavanshi': 'V Sooryavanshi',
    'V Suryavanshi': 'V Sooryavanshi',
  };

  function fixList(list: string[]): { fixed: string[]; changes: string[] } {
    const changes: string[] = [];
    const fixed = list.map(name => {
      const canonical = NAME_FIXES[name];
      if (canonical) { changes.push(`${name} → ${canonical}`); return canonical; }
      return name;
    });
    return { fixed, changes };
  }

  const orange = fixList(row.orange_cap_rankings || []);
  const purple = fixList(row.purple_cap_rankings || []);
  const allChanges = [...orange.changes, ...purple.changes];

  if (allChanges.length === 0) {
    return NextResponse.json({ message: 'No fixes needed', orange: row.orange_cap_rankings, purple: row.purple_cap_rankings });
  }

  await db`UPDATE live_data SET orange_cap_rankings = ${JSON.stringify(orange.fixed)}, purple_cap_rankings = ${JSON.stringify(purple.fixed)}, updated_at = NOW() WHERE id = ${row.id}`;

  return NextResponse.json({ message: 'Fixed', changes: allChanges, orange: orange.fixed, purple: purple.fixed });
}
