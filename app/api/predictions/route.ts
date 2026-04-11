import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await getDB()`SELECT * FROM predictions WHERE user_id = ${session.userId}`;
  return NextResponse.json({ predictions: rows[0] || null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const {
    orange_cap_1, orange_cap_2, orange_cap_3,
    purple_cap_1, purple_cap_2, purple_cap_3,
    top4_team_1, top4_team_2, top4_team_3, top4_team_4,
    ipl_winner
  } = data;

  const existing = await getDB()`SELECT id, locked FROM predictions WHERE user_id = ${session.userId}`;
  if (existing[0]?.locked) {
    return NextResponse.json({ error: 'Predictions are locked' }, { status: 403 });
  }

  if (existing.length > 0) {
    await getDB()`
      UPDATE predictions SET
        orange_cap_1=${orange_cap_1}, orange_cap_2=${orange_cap_2}, orange_cap_3=${orange_cap_3},
        purple_cap_1=${purple_cap_1}, purple_cap_2=${purple_cap_2}, purple_cap_3=${purple_cap_3},
        top4_team_1=${top4_team_1}, top4_team_2=${top4_team_2}, top4_team_3=${top4_team_3}, top4_team_4=${top4_team_4},
        ipl_winner=${ipl_winner}, updated_at=NOW()
      WHERE user_id=${session.userId}
    `;
  } else {
    await getDB()`
      INSERT INTO predictions (user_id, orange_cap_1, orange_cap_2, orange_cap_3, purple_cap_1, purple_cap_2, purple_cap_3, top4_team_1, top4_team_2, top4_team_3, top4_team_4, ipl_winner)
      VALUES (${session.userId}, ${orange_cap_1}, ${orange_cap_2}, ${orange_cap_3}, ${purple_cap_1}, ${purple_cap_2}, ${purple_cap_3}, ${top4_team_1}, ${top4_team_2}, ${top4_team_3}, ${top4_team_4}, ${ipl_winner})
    `;
  }

  return NextResponse.json({ success: true });
}
