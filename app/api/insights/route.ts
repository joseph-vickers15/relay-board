import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }
  if (session.role !== 'Director' && session.role !== 'SVP' && !session.isSuperAdmin) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  // Only a super admin can look at a department other than their own --
  // for everyone else, the requested departmentId param is ignored.
  const requestedDeptId = request.nextUrl.searchParams.get('departmentId');
  const targetDeptId =
    session.isSuperAdmin && requestedDeptId ? Number(requestedDeptId) : session.departmentId;

  const loginsByDay = await sql`
    SELECT to_char(le.logged_in_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
    FROM login_events le
    JOIN people p ON p.id = le.person_id
    WHERE le.logged_in_at > now() - interval '30 days' AND p.department_id = ${targetDeptId}
    GROUP BY day
    ORDER BY day
  `;

  const ideasByDay = await sql`
    SELECT to_char(i.created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
    FROM ideas i
    JOIN people author ON author.id = i.author_id
    WHERE i.created_at > now() - interval '30 days' AND author.department_id = ${targetDeptId}
    GROUP BY day
    ORDER BY day
  `;

  const [totals] = await sql`
    SELECT
      (SELECT COUNT(*) FROM people WHERE department_id = ${targetDeptId}) AS total_people,
      (SELECT COUNT(DISTINCT le.person_id) FROM login_events le
        JOIN people p ON p.id = le.person_id
        WHERE le.logged_in_at > now() - interval '7 days' AND p.department_id = ${targetDeptId}
      ) AS active_last_7_days,
      (SELECT COUNT(*) FROM people
        WHERE department_id = ${targetDeptId}
          AND id NOT IN (SELECT DISTINCT person_id FROM login_events)
      ) AS never_logged_in
  `;

  const inactivePeople = await sql`
    SELECT p.id, p.name, p.role, MAX(le.logged_in_at) AS last_login
    FROM people p
    LEFT JOIN login_events le ON le.person_id = p.id
    WHERE p.department_id = ${targetDeptId}
    GROUP BY p.id, p.name, p.role
    HAVING MAX(le.logged_in_at) IS NULL OR MAX(le.logged_in_at) < now() - interval '14 days'
    ORDER BY last_login ASC NULLS FIRST
  `;

  const topContributors = await sql`
    SELECT p.name, COUNT(i.id) AS idea_count
    FROM people p
    LEFT JOIN ideas i ON i.author_id = p.id
    WHERE p.department_id = ${targetDeptId}
    GROUP BY p.id, p.name
    HAVING COUNT(i.id) > 0
    ORDER BY idea_count DESC
    LIMIT 8
  `;

  const ideaFunnel = await sql`
    SELECT i.status, COUNT(*) AS count
    FROM ideas i
    JOIN people author ON author.id = i.author_id
    WHERE author.department_id = ${targetDeptId}
    GROUP BY i.status
  `;

  const [announcementEngagement] = await sql`
    SELECT COUNT(*) AS total, COUNT(ar.acknowledged_at) AS acknowledged
    FROM announcement_recipients ar
    JOIN people p ON p.id = ar.recipient_id
    WHERE p.department_id = ${targetDeptId}
  `;

  const categoryUsage = await sql`
    SELECT c.name, COUNT(f.id) AS count
    FROM categories c
    LEFT JOIN announcement_filings f ON f.category_id = c.id
    LEFT JOIN people p ON p.id = f.person_id AND p.department_id = ${targetDeptId}
    WHERE f.id IS NULL OR p.id IS NOT NULL
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
