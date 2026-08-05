import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

async function attachEvents(ideas: any[]) {
  if (ideas.length === 0) return ideas;
  const ids = ideas.map((i) => i.id);
  const events = await sql`
    SELECT e.idea_id, e.id, e.event_type, e.note, e.created_at,
           p.name AS actor_name, p.role AS actor_role
    FROM idea_events e
    JOIN people p ON p.id = e.actor_id
    WHERE e.idea_id = ANY(${ids})
    ORDER BY e.created_at ASC
  `;
  return ideas.map((idea) => ({
    ...idea,
    events: events.filter((e) => e.idea_id === idea.id),
  }));
}

async function attachFiles(ideas: any[]) {
  if (ideas.length === 0) return ideas;
  const ids = ideas.map((i) => i.id);
  const files = await sql`
    SELECT id, idea_id, file_name, file_url, file_size, content_type, uploaded_at
    FROM idea_attachments
    WHERE idea_id = ANY(${ids})
    ORDER BY uploaded_at ASC
  `;
  return ideas.map((idea) => ({
    ...idea,
    attachments: files.filter((f) => f.idea_id === idea.id),
  }));
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get('scope') || 'mine';
  const me = session.personId;

  let ideas;
  if (scope === 'implemented') {
    // Company-wide, visible to every role -- a shared highlight reel
    // of ideas that actually went somewhere, not filtered by who's
    // involved.
    ideas = await sql`
      SELECT i.id, i.title, i.body, i.status, i.created_at, i.updated_at,
             author.name AS author_name, author.role AS author_role,
             owner.id AS current_owner_id, owner.name AS current_owner_name,
             owner.role AS current_owner_role,
             NULL AS escalate_to_name,
             EXISTS(
               SELECT 1 FROM idea_followers f WHERE f.idea_id = i.id AND f.follower_id = ${me}
             ) AS is_following
      FROM ideas i
      JOIN people author ON author.id = i.author_id
      LEFT JOIN people owner ON owner.id = i.current_owner_id
      WHERE i.status = 'implemented'
      ORDER BY i.updated_at DESC
    `;
  } else if (scope === 'action') {
    ideas = await sql`
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
      WHERE i.current_owner_id = ${me} AND i.status NOT IN ('implemented', 'declined')
      ORDER BY i.updated_at DESC
    `;
  } else if (scope === 'following') {
    ideas = await sql`
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
      WHERE EXISTS (
        SELECT 1 FROM idea_followers f2 WHERE f2.idea_id = i.id AND f2.follower_id = ${me}
      )
      ORDER BY i.updated_at DESC
    `;
  } else {
    ideas = await sql`
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
      WHERE i.author_id = ${me}
      ORDER BY i.updated_at DESC
    `;
  }

  const withEvents = await attachEvents(ideas);
  const withFiles = await attachFiles(withEvents);
  return NextResponse.json({ ideas: withFiles });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const { title, body } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
  }

  const [me] = await sql`SELECT manager_id FROM people WHERE id = ${session.personId}`;
  if (!me?.manager_id) {
    return NextResponse.json(
      { error: 'You have nobody to submit an idea to.' },
      { status: 400 }
    );
  }

  const [idea] = await sql`
    INSERT INTO ideas (author_id, title, body, status, current_owner_id)
    VALUES (${session.personId}, ${title}, ${body}, 'submitted', ${me.manager_id})
    RETURNING id
  `;

  // Authors automatically follow their own idea.
  await sql`
    INSERT INTO idea_followers (idea_id, follower_id)
    VALUES (${idea.id}, ${session.personId})
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({ success: true, id: idea.id });
}
