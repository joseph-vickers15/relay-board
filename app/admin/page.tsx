import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { isPeopleLeader } from '@/lib/admin';
import AdminApp from './admin-app';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }

  const allowed = await isPeopleLeader(session.personId);
  if (!allowed) {
    redirect('/board');
  }

  return <AdminApp session={session} />;
}
