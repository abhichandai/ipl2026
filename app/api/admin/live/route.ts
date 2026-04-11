import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await getDB()`SELECT * FROM live_data LIMIT 1`;
  return NextResponse.json({ data: rows[0] || null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orange_cap_rankings, purple_cap_rankings, top4_teams, tournament_winner } = await req.json();

  await getDB()`
    UPDATE live_data SET
      orange_cap_rankings = ${JSON.stringify(orange_cap_rankings)},
      purple_cap_rankings = ${JSON.stringify(purple_cap_rankings)},
      top4_teams = ${JSON.stringify(top4_teams)},
      tournament_winner = ${tournament_winner || null},
      updated_at = NOW()
    WHERE id = (SELECT id FROM live_data LIMIT 1)
  `;

  return NextResponse.json({ success: true });
}
