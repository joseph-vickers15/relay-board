import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { isWithinAuthority, isPeopleLeader, slugify } from '@/lib/admin';

const VALID_ROLES = ['SVP', 'Director', 'Senior Manager', 'Manager', 'Tier 3', 'IC'];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }
  if (!(await isPeopleLeader(session.personId))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { name, role, managerId } = await request.json();
  if (!name?.trim() || !role || !managerId) {
    return NextResponse.json(
      { error: 'Name, role, and manager are all required.' },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }
  if (!(await isWithinAuthority(session.personId, managerId))) {
    return NextResponse.json(
      { error: 'You can only add people under yourself or your own team.' },
      { status: 403 }
    );
  }

  let id = slugify(name);
  const [existing] = await sql`SELECT id FROM people WHERE id = ${id}`;
  if (existing) {
    id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const defaultHash = await bcrypt.hash('1234', 10);

  await sql`
    INSERT INTO people (id, name, role, manager_id, password_hash, must_change_password)
    VALUES (${id}, ${name.trim()}, ${role}, ${managerId}, ${defaultHash}, TRUE)
  `;

  return NextResponse.json({ success: true, id });
}
