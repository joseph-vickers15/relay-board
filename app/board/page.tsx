import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LogoutButton from './logout-button';

export default async function BoardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-playon-ink px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/40">Signed in as</p>
            <h1 className="font-display text-2xl font-bold">
              {session.name} <span className="text-white/40">· {session.role}</span>
            </h1>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">
          Announcements and Ideas will show up here in the next steps. For
          now, this page just proves your login worked.
        </div>
      </div>
    </main>
  );
}
