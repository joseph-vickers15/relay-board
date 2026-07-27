import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const announcementId = Number(params.id);
  const { categoryId } = await request.json();

  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId is required.' }, { status: 400 });
  }

  // One filing per (person, announcement) — filing again just moves it
  // to the new category instead of creating a duplicate entry.
  await sql`
    INSERT INTO announcement_filings (person_id, announcement_id, category_id)
    VALUES (${session.personId}, ${announcementId}, ${Number(categoryId)})
    ON CONFLICT (person_id, announcement_id)
    DO UPDATE SET category_id = EXCLUDED.category_id, filed_at = now()
  `;

  return NextResponse.json({ success: true });
}
