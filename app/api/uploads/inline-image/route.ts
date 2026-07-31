import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/session';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL } from '@/lib/attachments';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files can be inserted inline.' }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: `Image is too large. Max size is ${MAX_ATTACHMENT_SIZE_LABEL}.` },
      { status: 400 }
    );
  }

  try {
    const blob = await put(`inline-images/${session.personId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error('Inline image upload failed:', err);
    return NextResponse.json(
      { error: `Upload failed: ${err?.message || 'unknown error'}` },
      { status: 500 }
    );
  }
}
