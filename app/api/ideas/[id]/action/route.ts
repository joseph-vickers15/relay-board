import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

const DECISION_ROLES = ['Director', 'SVP'];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const ideaId = Number(params.id);
  const { action, note } = await request.json();

  const [idea] = await sql`SELECT * FROM ideas WHERE id = ${ideaId}`;
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }
  if (idea.current_owner_id !== session.personId) {
    return NextResponse.json(
      { error: 'This idea is not currently assigned to you.' },
      { status: 403 }
    );
  }
  if (idea.status === 'implemented' || idea.status === 'declined') {
    return NextResponse.json({ error: 'This idea is already closed out.' }, { status: 400 });
  }

  const [ownerPerson] = await sql`SELECT role, manager_id FROM people WHERE id = ${session.personId}`;

  if (action === 'acknowledge') {
    if (idea.status === 'submitted') {
      await sql`UPDATE ideas SET status = 'acknowledged', updated_at = now() WHERE id = ${ideaId}`;
    }
    await sql`
      INSERT INTO idea_events (idea_id, actor_id, event_type, note)
      VALUES (${ideaId}, ${session.personId}, 'acknowledged', ${note || null})
    `;
  } else if (action === 'feedback') {
    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Feedback text is required.' }, { status: 400 });
    }
    await sql`UPDATE ideas SET status = 'feedback_given', updated_at = now() WHERE id = ${ideaId}`;
    await sql`
      INSERT INTO idea_events (idea_id, actor_id, event_type, note)
      VALUES (${ideaId}, ${session.personId}, 'feedback', ${note})
    `;
  } else if (action === 'escalate') {
    if (!ownerPerson.manager_id) {
      return NextResponse.json(
        { error: 'There is nobody above you to escalate this to.' },
        { status: 400 }
      );
    }
    await sql`
      UPDATE ideas
      SET status = 'escalated', current_owner_id = ${ownerPerson.manager_id}, updated_at = now()
      WHERE id = ${ideaId}
    `;
    await sql`
      INSERT INTO idea_events (idea_id, actor_id, event_type, note)
      VALUES (${ideaId}, ${session.personId}, 'escalated', ${note || null})
    `;
  } else if (action === 'implement' || action === 'decline') {
    if (!DECISION_ROLES.includes(ownerPerson.role)) {
      return NextResponse.json(
        { error: 'Only a Director or above can mark an idea implemented or declined.' },
        { status: 403 }
      );
    }
    const newStatus = action === 'implement' ? 'implemented' : 'declined';
    await sql`UPDATE ideas SET status = ${newStatus}, updated_at = now() WHERE id = ${ideaId}`;
    await sql`
      INSERT INTO idea_events (idea_id, actor_id, event_type, note)
      VALUES (${ideaId}, ${session.personId}, ${newStatus}, ${note || null})
    `;
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
