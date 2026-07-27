import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const announcementId = Number(params.id);

  await sql`
    UPDATE announcement_recipients
    SET acknowledged_at = now()
    WHERE announcement_id = ${announcementId}
      AND recipient_id = ${session.personId}
      AND acknowledged_at IS NULL
  `;

  return NextResponse.json({ success: true });
}
