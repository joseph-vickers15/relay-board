import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

// Creates an announcement and automatically cascades it to EVERYONE
// below the author in the org chart (their direct reports, their
// reports' reports, all the way down).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const { title, body } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
  }

  const [announcement] = await sql`
    INSERT INTO announcements (author_id, title, body)
    VALUES (${session.personId}, ${title}, ${body})
    RETURNING id, created_at
  `;

  await sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM people WHERE manager_id = ${session.personId}
      UNION ALL
      SELECT p.id FROM people p JOIN descendants d ON p.manager_id = d.id
    )
    INSERT INTO announcement_recipients (announcement_id, recipient_id)
    SELECT ${announcement.id}, id FROM descendants
    ON CONFLICT (announcement_id, recipient_id) DO NOTHING
  `;

  return NextResponse.json({ success: true, id: announcement.id });
}

// Lists announcements for the current person.
// ?scope=inbox   -> received, not yet filed into any category
// ?scope=sent    -> ones this person authored
// ?scope=category&categoryId=N -> received AND filed into category N
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get('scope') || 'inbox';
  const categoryId = request.nextUrl.searchParams.get('categoryId');

  if (scope === 'sent') {
    const rows = await sql`
      SELECT a.id, a.title, a.body, a.created_at,
             p.name AS author_name, p.role AS author_role
      FROM announcements a
      JOIN people p ON p.id = a.author_id
      WHERE a.author_id = ${session.personId}
      ORDER BY a.created_at DESC
    `;
    return NextResponse.json({ announcements: rows, isAuthorView: true });
  }

  if (scope === 'category' && categoryId) {
    const rows = await sql`
      SELECT a.id, a.title, a.body, a.created_at,
             p.name AS author_name, p.role AS author_role,
             ar.acknowledged_at
      FROM announcement_filings f
      JOIN announcements a ON a.id = f.announcement_id
      JOIN people p ON p.id = a.author_id
      JOIN announcement_recipients ar
        ON ar.announcement_id = a.id AND ar.recipient_id = ${session.personId}
      WHERE f.person_id = ${session.personId} AND f.category_id = ${Number(categoryId)}
      ORDER BY a.created_at DESC
    `;
    return NextResponse.json({ announcements: rows, isAuthorView: false });
  }

  // default: inbox — received, not yet filed anywhere
  const rows = await sql`
    SELECT a.id, a.title, a.body, a.created_at,
           p.name AS author_name, p.role AS author_role,
           ar.acknowledged_at
    FROM announcement_recipients ar
    JOIN announcements a ON a.id = ar.announcement_id
    JOIN people p ON p.id = a.author_id
    WHERE ar.recipient_id = ${session.personId}
      AND NOT EXISTS (
        SELECT 1 FROM announcement_filings f
        WHERE f.person_id = ${session.personId} AND f.announcement_id = a.id
      )
    ORDER BY a.created_at DESC
  `;
  return NextResponse.json({ announcements: rows, isAuthorView: false });
}
