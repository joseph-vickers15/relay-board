import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const departmentId = request.nextUrl.searchParams.get('departmentId');

  const people = departmentId
    ? await sql`SELECT id, name FROM people WHERE department_id = ${Number(departmentId)} ORDER BY name`
    : await sql`SELECT id, name FROM people ORDER BY name`;

  return NextResponse.json({ people });
}
