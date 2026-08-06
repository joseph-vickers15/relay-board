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
    const [row] = await sql`
      SELECT COUNT(*) AS count FROM people
      WHERE department_id = ${session.departmentId} AND id != ${session.personId}
    `;
    return NextResponse.json({ mode: 'fixed', icCount: Number(row.count) });
  }

  if (MANAGER_ROLES.includes(session.role)) {
    const people = await sql`
      SELECT id, name, role FROM people
      WHERE manager_id = ${session.personId} AND department_id = ${session.departmentId}
      ORDER BY name
    `;
    return NextResponse.json({ mode: 'direct', people });
  }

  if (LEADER_ROLES.includes(session.role)) {
    // Deliberately department-scoped, not tree-scoped -- the org chart
    // can span departments (everyone reports up to the SVP eventually)
    // but boards stay isolated per department.
    const people = await sql`
      SELECT id, name, role FROM people
      WHERE department_id = ${session.departmentId} AND id != ${session.personId}
      ORDER BY name
    `;
    return NextResponse.json({ mode: 'leader', people });
  }

  return NextResponse.json({ mode: 'none', people: [] });
}
