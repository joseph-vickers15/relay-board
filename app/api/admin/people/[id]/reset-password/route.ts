import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { isWithinAuthority } from '@/lib/admin';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const targetId = params.id;
  if (!(await isWithinAuthority(session.personId, targetId))) {
    return NextResponse.json(
      { error: 'You can only reset passwords for people on your own team.' },
      { status: 403 }
    );
  }

  const defaultHash = await bcrypt.hash('1234', 10);
  await sql`
    UPDATE people
    SET password_hash = ${defaultHash}, must_change_password = TRUE
    WHERE id = ${targetId}
  `;

  return NextResponse.json({ success: true });
}
