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

  const loginsByDay = await sql`
    SELECT to_char(logged_in_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
    FROM login_events
    WHERE logged_in_at > now() - interval '30 days'
    GROUP BY day
    ORDER BY day
  `;

  const ideasByDay = await sql`
    SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
    FROM ideas
    WHERE created_at > now() - interval '30 days'
    GROUP BY day
    ORDER BY day
  `;

  const [totals] = await sql`
    SELECT
      (SELECT COUNT(*) FROM people) AS total_people,
      (SELECT COUNT(DISTINCT person_id) FROM login_events
        WHERE logged_in_at > now() - interval '7 days') AS active_last_7_days,
      (SELECT COUNT(*) FROM people
        WHERE id NOT IN (SELECT DISTINCT person_id FROM login_events)) AS never_logged_in
  `;

  const inactivePeople = await sql`
    SELECT p.id, p.name, p.role, MAX(le.logged_in_at) AS last_login
    FROM people p
    LEFT JOIN login_events le ON le.person_id = p.id
    GROUP BY p.id, p.name, p.role
    HAVING MAX(le.logged_in_at) IS NULL OR MAX(le.logged_in_at) < now() - interval '14 days'
    ORDER BY last_login ASC NULLS FIRST
  `;

  const topContributors = await sql`
    SELECT p.name, COUNT(i.id) AS idea_count
    FROM people p
    LEFT JOIN ideas i ON i.author_id = p.id
    GROUP BY p.id, p.name
    HAVING COUNT(i.id) > 0
    ORDER BY idea_count DESC
    LIMIT 8
  `;

  const ideaFunnel = await sql`
    SELECT status, COUNT(*) AS count FROM ideas GROUP BY status
  `;

  const [announcementEngagement] = await sql`
    SELECT COUNT(*) AS total, COUNT(acknowledged_at) AS acknowledged
    FROM announcement_recipients
  `;

  const categoryUsage = await sql`
    SELECT c.name, COUNT(f.id) AS count
    FROM categories c
    LEFT JOIN announcement_filings f ON f.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY count DESC
  `;

  return NextResponse.json({
    loginsByDay,
    ideasByDay,
    totals,
    inactivePeople,
    topContributors,
    ideaFunnel,
    announcementEngagement,
    categoryUsage,
  });
}
