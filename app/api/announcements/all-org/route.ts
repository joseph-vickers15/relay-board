import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }
  if (session.role !== 'Director' && session.role !== 'SVP') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const searchTerm = request.nextUrl.searchParams.get('q') || '';
  const searchPattern = `%${searchTerm}%`;
  const sortOldestFirst = request.nextUrl.searchParams.get('sort') === 'oldest';

  const rows = await sql`
    SELECT a.id, a.title, a.body, a.created_at, a.author_id, a.tag,
           p.name AS author_name, p.role AS author_role,
           (SELECT COUNT(*) FROM announcement_recipients ar WHERE ar.announcement_id = a.id) AS recipient_count,
           (SELECT COUNT(*) FROM announcement_recipients ar
              WHERE ar.announcement_id = a.id AND ar.acknowledged_at IS NOT NULL) AS acknowledged_count
    FROM announcements a
    JOIN people p ON p.id = a.author_id
    WHERE (${searchTerm} = '' OR a.title ILIKE ${searchPattern} OR a.body ILIKE ${searchPattern})
  `;

  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const ordered = sortOldestFirst ? sorted : sorted.reverse();

  if (ordered.length === 0) {
    return NextResponse.json({ announcements: [] });
  }

  const ids = ordered.map((a) => a.id);
  const files = await sql`
    SELECT id, announcement_id, file_name, file_url, file_size, content_type, uploaded_at
    FROM announcement_attachments
    WHERE announcement_id = ANY(${ids})
    ORDER BY uploaded_at ASC
  `;

  const withFiles = ordered.map((a) => ({
    ...a,
    attachments: files.filter((f) => f.announcement_id === a.id),
  }));

  return NextResponse.json({ announcements: withFiles });
}
