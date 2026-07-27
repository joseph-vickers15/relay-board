import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const [row] = await sql`
    SELECT COUNT(*) AS count
    FROM ideas
    WHERE current_owner_id = ${session.personId}
      AND status NOT IN ('implemented', 'declined')
  `;

  return NextResponse.json({ needsActionCount: Number(row.count) });
}
