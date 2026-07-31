import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const announcementId = Number(params.id);
  const [announcement] = await sql`SELECT author_id FROM announcements WHERE id = ${announcementId}`;
  if (!announcement) {
    return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
  }

  const isAuthor = announcement.author_id === session.personId;
  const isOrgAdmin = session.role === 'Director' || session.role === 'SVP';

  if (!isAuthor && !isOrgAdmin) {
    return NextResponse.json(
      { error: 'You can only delete your own announcements.' },
      { status: 403 }
    );
  }

  // Recipients, filings, and attachments all cascade-delete automatically.
  await sql`DELETE FROM announcements WHERE id = ${announcementId}`;

  return NextResponse.json({ success: true });
}
