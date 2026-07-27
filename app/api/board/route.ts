import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const [inbox] = await sql`
    SELECT COUNT(*) AS count
    FROM announcement_recipients ar
    WHERE ar.recipient_id = ${session.personId}
      AND ar.acknowledged_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM announcement_filings f
        WHERE f.person_id = ${session.personId} AND f.announcement_id = ar.announcement_id
      )
  `;

  const [canCompose] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM people WHERE manager_id = ${session.personId}
    ) AS value
  `;

  return NextResponse.json({
    inboxCount: Number(inbox.count),
    canCompose: canCompose.value === true,
  });
}
