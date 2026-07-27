import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const categories = await sql`
    SELECT c.id, c.name, COUNT(f.id) AS filed_count
    FROM categories c
    LEFT JOIN announcement_filings f
      ON f.category_id = c.id AND f.person_id = ${session.personId}
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const { name } = await request.json();
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  }

  try {
    const [category] = await sql`
      INSERT INTO categories (name, created_by)
      VALUES (${trimmed}, ${session.personId})
      RETURNING id, name
    `;
    return NextResponse.json({ category });
  } catch {
    // Most likely a duplicate name (categories.name is UNIQUE)
    const [existing] = await sql`SELECT id, name FROM categories WHERE name = ${trimmed}`;
    if (existing) {
      return NextResponse.json({ category: existing });
    }
    return NextResponse.json({ error: 'Could not create category.' }, { status: 500 });
  }
}
