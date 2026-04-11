import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';
import { hashPassword, createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDB();
    const { email, displayName, password } = await req.json();

    if (!email || !displayName || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = await getDB()`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const users = await getDB()`
      INSERT INTO users (email, display_name, password_hash)
      VALUES (${email}, ${displayName}, ${hash})
      RETURNING id, is_admin
    `;

    const token = await createToken(users[0].id, users[0].is_admin);
    const res = NextResponse.json({ success: true });
    res.cookies.set('session', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/' });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
