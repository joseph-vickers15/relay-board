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
  const { newManagerId } = await request.json();
  if (!newManagerId) {
    return NextResponse.json({ error: 'newManagerId is required.' }, { status: 400 });
  }

  const targetAllowed = await isWithinAuthority(session.personId, targetId);
  const newManagerAllowed = await isWithinAuthority(session.personId, newManagerId);
  if (!targetAllowed || !newManagerAllowed) {
    return NextResponse.json(
      { error: 'You can only move people within your own team.' },
      { status: 403 }
    );
  }
  if (targetId === newManagerId) {
    return NextResponse.json({ error: 'Someone cannot manage themselves.' }, { status: 400 });
  }

  await sql`
    UPDATE people
    SET manager_id = ${newManagerId},
        department_id = (SELECT department_id FROM people WHERE id = ${newManagerId})
    WHERE id = ${targetId}
  `;

  return NextResponse.json({ success: true });
}
