import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyPassword, createToken, isAdminPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const users = await getDB()`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    // Check if user should be admin
    const adminCheck = await isAdminPassword(password);
    if (adminCheck && !user.is_admin) {
      await getDB()`UPDATE users SET is_admin = TRUE WHERE id = ${user.id}`;
      user.is_admin = true;
    }

    const token = await createToken(user.id, user.is_admin);
    const res = NextResponse.json({ success: true });
    res.cookies.set('session', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/' });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
