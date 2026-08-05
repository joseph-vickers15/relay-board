import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const LEADER_ROLES = ['Director', 'SVP'];
const MANAGER_ROLES = ['Manager', 'Senior Manager'];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  if (session.role === 'Tier 3') {
    const [row] = await sql`SELECT COUNT(*) AS count FROM people WHERE id != ${session.personId}`;
    return NextResponse.json({ mode: 'fixed', icCount: Number(row.count) });
  }

  if (MANAGER_ROLES.includes(session.role)) {
    const people = await sql`
      SELECT id, name, role FROM people WHERE manager_id = ${session.personId} ORDER BY name
    `;
    return NextResponse.json({ mode: 'direct', people });
  }

  if (LEADER_ROLES.includes(session.role)) {
    const people = await sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM people WHERE manager_id = ${session.personId}
        UNION ALL
        SELECT p.id FROM people p JOIN tree t ON p.manager_id = t.id
      )
      SELECT p.id, p.name, p.role
      FROM people p
      WHERE p.id IN (SELECT id FROM tree)
      ORDER BY p.name
    `;
    return NextResponse.json({ mode: 'leader', people });
  }

  return NextResponse.json({ mode: 'none', people: [] });
}
