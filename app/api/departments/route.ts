import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const departments = await sql`SELECT id, name FROM departments ORDER BY name`;
  return NextResponse.json({ departments });
}
