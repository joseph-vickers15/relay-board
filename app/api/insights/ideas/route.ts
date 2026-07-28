import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }
  if (session.role !== 'Director' && session.role !== 'SVP') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const me = session.personId;

  // Oldest-updated first: whatever's been sitting untouched the longest
  // surfaces at the top, which is exactly what's useful when someone's
  // out and their queue is quietly backing up.
  const ideas = await sql`
    SELECT i.id, i.title, i.body, i.status, i.created_at, i.updated_at,
           author.name AS author_name, author.role AS author_role,
           owner.id AS current_owner_id, owner.name AS current_owner_name,
           owner.role AS current_owner_role,
           owner_mgr.name AS escalate_to_name,
           EXISTS(
             SELECT 1 FROM idea_followers f WHERE f.idea_id = i.id AND f.follower_id = ${me}
           ) AS is_following
    FROM ideas i
    JOIN people author ON author.id = i.author_id
    LEFT JOIN people owner ON owner.id = i.current_owner_id
    LEFT JOIN people owner_mgr ON owner_mgr.id = owner.manager_id
    WHERE i.status NOT IN ('implemented', 'declined')
    ORDER BY i.updated_at ASC
  `;

  if (ideas.length === 0) {
    return NextResponse.json({ ideas: [] });
  }

  const ids = ideas.map((i) => i.id);

  const events = await sql`
    SELECT e.idea_id, e.id, e.event_type, e.note, e.created_at,
           p.name AS actor_name, p.role AS actor_role
    FROM idea_events e
    JOIN people p ON p.id = e.actor_id
    WHERE e.idea_id = ANY(${ids})
    ORDER BY e.created_at ASC
  `;

  const files = await sql`
    SELECT id, idea_id, file_name, file_url, file_size, content_type, uploaded_at
    FROM idea_attachments
    WHERE idea_id = ANY(${ids})
    ORDER BY uploaded_at ASC
  `;

  const withDetails = ideas.map((idea) => ({
    ...idea,
    events: events.filter((e) => e.idea_id === idea.id),
    attachments: files.filter((f) => f.idea_id === idea.id),
  }));

  return NextResponse.json({ ideas: withDetails });
}
