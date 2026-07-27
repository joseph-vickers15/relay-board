import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const ideaId = Number(params.id);
  const { follow } = await request.json();

  if (follow) {
    await sql`
      INSERT INTO idea_followers (idea_id, follower_id)
      VALUES (${ideaId}, ${session.personId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await sql`
      DELETE FROM idea_followers WHERE idea_id = ${ideaId} AND follower_id = ${session.personId}
    `;
  }

  return NextResponse.json({ success: true });
}
