import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const people = await sql`SELECT id, name FROM people ORDER BY name`;
  return NextResponse.json({ people });
}
