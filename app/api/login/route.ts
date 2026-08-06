import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { createSessionCookie, SESSION_COOKIE } from '@/lib/session';

export async function POST(request: NextRequest) {
  const { personId, password } = await request.json();

  if (!personId || !password) {
    return NextResponse.json({ error: 'Select your name and enter a password.' }, { status: 400 });
  }

  const rows = await sql`
    SELECT p.id, p.name, p.role, p.password_hash, p.must_change_password,
           p.department_id, p.is_super_admin, d.name AS department_name
    FROM people p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = ${personId}
  `;

  const person = rows[0] as
    | {
        id: string;
        name: string;
        role: string;
        password_hash: string;
        must_change_password: boolean;
        department_id: number;
        department_name: string;
        is_super_admin: boolean;
      }
    | undefined;

  if (!person) {
    return NextResponse.json({ error: 'That name was not found.' }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(password, person.password_hash);
  if (!passwordMatches) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await createSessionCookie({
    personId: person.id,
    name: person.name,
    role: person.role,
    departmentId: person.department_id,
    departmentName: person.department_name,
    isSuperAdmin: person.is_super_admin,
  });

  await sql`INSERT INTO login_events (person_id) VALUES (${person.id})`;

  const response = NextResponse.json({
    success: true,
    mustChangePassword: person.must_change_password,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
