import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

// Returns, for one announcement, a breakdown of acknowledgment by each
// of the author's direct reports' teams -- e.g. "Sam Williamson's team: 9/13
// acknowledged" -- plus an overall total. Only the author can see this.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const announcementId = Number(params.id);

  const [announcement] = await sql`
    SELECT author_id FROM announcements WHERE id = ${announcementId}
  `;

  if (!announcement || announcement.author_id !== session.personId) {
    return NextResponse.json({ error: 'Not authorized to view these stats.' }, { status: 403 });
  }

  const breakdown = await sql`
    WITH RECURSIVE tree AS (
      SELECT id, id AS root FROM people WHERE manager_id = ${session.personId}
      UNION ALL
      SELECT p.id, t.root FROM people p JOIN tree t ON p.manager_id = t.id
    )
    SELECT
      tree.root AS root_id,
      root_person.name AS root_name,
      COUNT(ar.id) AS total,
      COUNT(ar.acknowledged_at) AS acknowledged,
      bool_or(ar.recipient_id = tree.root AND ar.acknowledged_at IS NOT NULL) AS root_acknowledged
    FROM tree
    JOIN people root_person ON root_person.id = tree.root
    LEFT JOIN announcement_recipients ar
      ON ar.recipient_id = tree.id AND ar.announcement_id = ${announcementId}
    GROUP BY tree.root, root_person.name
    ORDER BY root_person.name
  `;

  const [overall] = await sql`
    SELECT COUNT(*) AS total, COUNT(acknowledged_at) AS acknowledged
    FROM announcement_recipients
    WHERE announcement_id = ${announcementId}
  `;

  return NextResponse.json({ overall, breakdown });
}
