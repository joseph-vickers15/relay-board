import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

const LEADER_ROLES = ['Director', 'SVP'];
const MANAGER_ROLES = ['Manager', 'Senior Manager'];

async function attachFiles(announcements: any[]) {
  if (announcements.length === 0) return announcements;
  const ids = announcements.map((a) => a.id);
  const files = await sql`
    SELECT id, announcement_id, file_name, file_url, file_size, content_type, uploaded_at
    FROM announcement_attachments
    WHERE announcement_id = ANY(${ids})
    ORDER BY uploaded_at ASC
  `;
  return announcements.map((a) => ({
    ...a,
    attachments: files.filter((f) => f.announcement_id === a.id),
  }));
}

// Creates an announcement and sends it to a specific set of recipients,
// with the allowed set depending on the sender's role:
// - Manager/Senior Manager: their own direct reports (default: all of them)
// - Director/SVP: anyone below them in the org chart, their choice
// - Tier 3: always every IC in the company, no picker
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const { title, body, recipientIds, tag } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
  }

  let finalRecipientIds: string[];

  if (session.role === 'Tier 3') {
    const rows = await sql`SELECT id FROM people WHERE role = 'IC'`;
    finalRecipientIds = rows.map((r) => r.id);
  } else if (MANAGER_ROLES.includes(session.role)) {
    const directReports = await sql`
      SELECT id FROM people WHERE manager_id = ${session.personId}
    `;
    const allowedIds = new Set(directReports.map((r) => r.id));
    const requested: string[] = Array.isArray(recipientIds) ? recipientIds : [];
    const chosen = requested.filter((id) => allowedIds.has(id));
    // Default to the whole team if nothing specific was chosen.
    finalRecipientIds = chosen.length > 0 ? chosen : Array.from(allowedIds);
  } else if (LEADER_ROLES.includes(session.role)) {
    const descendants = await sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM people WHERE manager_id = ${session.personId}
        UNION ALL
        SELECT p.id FROM people p JOIN tree t ON p.manager_id = t.id
      )
      SELECT id FROM tree
    `;
    const allowedIds = new Set(descendants.map((r) => r.id));
    const requested: string[] = Array.isArray(recipientIds) ? recipientIds : [];
    finalRecipientIds = requested.filter((id) => allowedIds.has(id));
    if (finalRecipientIds.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one recipient.' },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: 'You are not authorized to send announcements.' },
      { status: 403 }
    );
  }

  const [announcement] = await sql`
    INSERT INTO announcements (author_id, title, body, tag)
    VALUES (${session.personId}, ${title}, ${body}, ${tag || null})
    RETURNING id, created_at
  `;

  if (finalRecipientIds.length > 0) {
    await sql`
      INSERT INTO announcement_recipients (announcement_id, recipient_id)
      SELECT ${announcement.id}, id FROM unnest(${finalRecipientIds}::text[]) AS id
      ON CONFLICT (announcement_id, recipient_id) DO NOTHING
    `;
  }

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
  const searchTerm = request.nextUrl.searchParams.get('q') || '';
  const searchPattern = `%${searchTerm}%`;
  const sortOldestFirst = request.nextUrl.searchParams.get('sort') === 'oldest';

  function applySort(rows: any[]): any[] {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sortOldestFirst ? sorted : sorted.reverse();
  }

  if (scope === 'sent') {
    const rows = await sql`
      SELECT a.id, a.title, a.body, a.created_at, a.author_id, a.tag,
             p.name AS author_name, p.role AS author_role
      FROM announcements a
      JOIN people p ON p.id = a.author_id
      WHERE a.author_id = ${session.personId}
        AND (${searchTerm} = '' OR a.title ILIKE ${searchPattern} OR a.body ILIKE ${searchPattern})
    `;
    return NextResponse.json({
      announcements: await attachFiles(applySort(rows)),
      isAuthorView: true,
    });
  }

  if (scope === 'category' && categoryId) {
    const rows = await sql`
      SELECT a.id, a.title, a.body, a.created_at, a.author_id, a.tag,
             p.name AS author_name, p.role AS author_role,
             ar.acknowledged_at
      FROM announcement_filings f
      JOIN announcements a ON a.id = f.announcement_id
      JOIN people p ON p.id = a.author_id
      JOIN announcement_recipients ar
        ON ar.announcement_id = a.id AND ar.recipient_id = ${session.personId}
      WHERE f.person_id = ${session.personId} AND f.category_id = ${Number(categoryId)}
        AND (${searchTerm} = '' OR a.title ILIKE ${searchPattern} OR a.body ILIKE ${searchPattern})
    `;
    return NextResponse.json({
      announcements: await attachFiles(applySort(rows)),
      isAuthorView: false,
    });
  }

  // default: inbox — received, not yet filed anywhere.
  // Unacknowledged items always float to the top as a group; once
  // acknowledged, an item drops down into the acknowledged group,
  // but within each group the arrival-order sort still applies.
  const rows = await sql`
    SELECT a.id, a.title, a.body, a.created_at, a.author_id, a.tag,
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
      AND (${searchTerm} = '' OR a.title ILIKE ${searchPattern} OR a.body ILIKE ${searchPattern})
  `;
  const sortedRows = applySort(rows);
  const unacknowledged = sortedRows.filter((r) => !r.acknowledged_at);
  const acknowledged = sortedRows.filter((r) => r.acknowledged_at);
  const groupedRows = [...unacknowledged, ...acknowledged];

  return NextResponse.json({
    announcements: await attachFiles(groupedRows),
    isAuthorView: false,
  });
}
