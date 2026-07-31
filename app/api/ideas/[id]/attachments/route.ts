import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL } from '@/lib/attachments';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const ideaId = Number(params.id);
  const [idea] = await sql`SELECT author_id FROM ideas WHERE id = ${ideaId}`;
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }
  if (idea.author_id !== session.personId) {
    return NextResponse.json(
      { error: 'Only the person who submitted this can add attachments.' },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: `File is too large. Max size is ${MAX_ATTACHMENT_SIZE_LABEL}.` },
      { status: 400 }
    );
  }

  let blob;
  try {
    blob = await put(`ideas/${ideaId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
  } catch (err: any) {
    console.error('Blob upload failed:', err);
    return NextResponse.json(
      { error: `Upload failed: ${err?.message || 'unknown error'}. Check that BLOB_READ_WRITE_TOKEN is set in Vercel.` },
      { status: 500 }
    );
  }

  const [attachment] = await sql`
    INSERT INTO idea_attachments
      (idea_id, file_name, file_url, file_size, content_type, uploaded_by)
    VALUES (${ideaId}, ${file.name}, ${blob.url}, ${file.size}, ${file.type || null}, ${session.personId})
    RETURNING id, file_name, file_url, file_size, content_type, uploaded_at
  `;

  return NextResponse.json({ attachment });
}
