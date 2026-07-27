import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json(
      { error: 'Password must be at least 4 characters.' },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await sql`
    UPDATE people
    SET password_hash = ${newHash}, must_change_password = FALSE
    WHERE id = ${session.personId}
  `;

  return NextResponse.json({ success: true });
}
