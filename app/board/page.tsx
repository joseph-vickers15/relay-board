import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import BoardApp from './board-app';

export default async function BoardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return <BoardApp session={session} />;
}
