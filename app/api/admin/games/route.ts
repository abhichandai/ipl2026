import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const games = await getDB()`SELECT * FROM games ORDER BY match_date ASC, id ASC`;
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, ...data } = await req.json();

  if (action === 'add') {
    const { match_date, team1, team2, is_playoff } = data;
    await getDB()`INSERT INTO games (match_date, team1, team2, is_playoff) VALUES (${match_date}, ${team1}, ${team2}, ${is_playoff || false})`;
  } else if (action === 'result') {
    const { game_id, actual_winner } = data;
    await getDB()`UPDATE games SET actual_winner = ${actual_winner} WHERE id = ${game_id}`;
  } else if (action === 'delete') {
    await getDB()`DELETE FROM games WHERE id = ${data.game_id}`;
  }

  return NextResponse.json({ success: true });
}
