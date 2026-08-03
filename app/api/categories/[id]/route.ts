import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';

async function canManage(categoryId: number, personId: string, role: string): Promise<boolean> {
  if (role === 'Director' || role === 'SVP') return true;

  const [category] = await sql`SELECT created_by, is_default FROM categories WHERE id = ${categoryId}`;
  if (!category) return false;
  if (category.is_default) return false;

  return category.created_by === personId;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const categoryId = Number(params.id);
  const { name } = await request.json();
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  }

  if (!(await canManage(categoryId, session.personId, session.role))) {
    return NextResponse.json(
      { error: 'You can only rename categories you created (or ask a Director/SVP).' },
      { status: 403 }
    );
  }

  try {
    const [category] = await sql`
      UPDATE categories SET name = ${trimmed} WHERE id = ${categoryId}
      RETURNING id, name
    `;
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json(
      { error: 'A category with that name already exists.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const categoryId = Number(params.id);

  if (!(await canManage(categoryId, session.personId, session.role))) {
    return NextResponse.json(
      { error: 'You can only delete categories you created (or ask a Director/SVP).' },
      { status: 403 }
    );
  }

  // Anything filed into this category (by anyone) loses that filing and
  // reappears in the relevant person's Inbox -- it isn't deleted, just unfiled.
  await sql`DELETE FROM categories WHERE id = ${categoryId}`;

  return NextResponse.json({ success: true });
}
