import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

// Returns, for one announcement, a breakdown of acknowledgment by each
// of the author's direct reports' teams -- e.g. "Sam Williamson's team: 9/13
// acknowledged" -- plus an overall total. The author can always see this;
// Directors/SVP can see it for any announcement, since they're allowed
// company-wide visibility.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const announcementId = Number(params.id);

  const [announcement] = await sql`
    SELECT author_id FROM announcements WHERE id = ${announcementId}
  `;

  if (!announcement) {
    return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
  }

  const isAuthor = announcement.author_id === session.personId;
  const isOrgAdmin = session.role === 'Director' || session.role === 'SVP';
  if (!isAuthor && !isOrgAdmin) {
    return NextResponse.json({ error: 'Not authorized to view these stats.' }, { status: 403 });
  }

  // Always root the breakdown at the actual sender, not the viewer --
  // matters when a Director/SVP is looking at someone else's announcement.
  const authorId = announcement.author_id;

  let breakdown = await sql`
    WITH RECURSIVE tree AS (
      SELECT id, id AS root FROM people WHERE manager_id = ${authorId}
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

  let members = await sql`
    WITH RECURSIVE tree AS (
      SELECT id, id AS root FROM people WHERE manager_id = ${authorId}
      UNION ALL
      SELECT p.id, t.root FROM people p JOIN tree t ON p.manager_id = t.id
    )
    SELECT tree.root AS root_id, p.id, p.name, p.role, ar.acknowledged_at
    FROM tree
    JOIN people p ON p.id = tree.id
    LEFT JOIN announcement_recipients ar
      ON ar.recipient_id = tree.id AND ar.announcement_id = ${announcementId}
    ORDER BY p.name
  `;

  // Some senders (Tier 3, or anyone using "Choose specific people" across
  // teams) don't have a natural reporting-chain group to bucket recipients
  // under -- the tree above comes back empty even though real recipients
  // exist. Fall back to one flat group covering everyone who actually got it.
  if (breakdown.length === 0) {
    const flatMembers = await sql`
      SELECT p.id, p.name, p.role, ar.acknowledged_at
      FROM announcement_recipients ar
      JOIN people p ON p.id = ar.recipient_id
      WHERE ar.announcement_id = ${announcementId}
      ORDER BY p.name
    `;

    if (flatMembers.length > 0) {
      const ackCount = flatMembers.filter((m) => m.acknowledged_at).length;
      members = flatMembers.map((m) => ({ ...m, root_id: authorId }));
      breakdown = [
        {
          root_id: authorId,
          root_name: 'All recipients',
          total: String(flatMembers.length),
          acknowledged: String(ackCount),
          root_acknowledged: false,
        },
      ];
    }
  }

  const [overall] = await sql`
    SELECT COUNT(*) AS total, COUNT(acknowledged_at) AS acknowledged
    FROM announcement_recipients
    WHERE announcement_id = ${announcementId}
  `;

  return NextResponse.json({ overall, breakdown, members });
}
