import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preds = await getDB()`
    SELECT gp.game_id, gp.predicted_winner, g.team1, g.team2, g.actual_winner, g.match_date
    FROM game_predictions gp
    JOIN games g ON g.id = gp.game_id
    WHERE gp.user_id = ${session.userId}
  `;
  return NextResponse.json({ predictions: preds });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { game_id, predicted_winner } = await req.json();

  // Can't predict after game date
  const games = await getDB()`SELECT match_date, actual_winner FROM games WHERE id = ${game_id}`;
  if (!games[0]) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (games[0].actual_winner) return NextResponse.json({ error: 'Game already played' }, { status: 400 });

  await getDB()`
    INSERT INTO game_predictions (user_id, game_id, predicted_winner)
    VALUES (${session.userId}, ${game_id}, ${predicted_winner})
    ON CONFLICT (user_id, game_id) DO UPDATE SET predicted_winner = ${predicted_winner}
  `;

  return NextResponse.json({ success: true });
}
