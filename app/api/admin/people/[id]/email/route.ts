import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { isWithinAuthority } from '@/lib/admin';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const targetId = params.id;
  const { email } = await request.json();
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (!(await isWithinAuthority(session.personId, targetId))) {
    return NextResponse.json(
      { error: 'You can only edit email addresses for people on your own team.' },
      { status: 403 }
    );
  }

  await sql`UPDATE people SET email = ${trimmed} WHERE id = ${targetId}`;

  return NextResponse.json({ success: true });
}
