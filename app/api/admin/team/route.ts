import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const [leaderCheck] = await sql`
    SELECT EXISTS(SELECT 1 FROM people WHERE manager_id = ${session.personId}) AS value
  `;
  if (!leaderCheck.value) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  // "My authority" = myself + everyone below me, recursively.
  const people = await sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM people WHERE id = ${session.personId}
      UNION ALL
      SELECT p.id FROM people p JOIN tree t ON p.manager_id = t.id
    )
    SELECT p.id, p.name, p.role, p.manager_id, p.must_change_password,
           mgr.name AS manager_name
    FROM people p
    LEFT JOIN people mgr ON mgr.id = p.manager_id
    WHERE p.id IN (SELECT id FROM tree)
    ORDER BY p.name
  `;

  return NextResponse.json({ people });
}
