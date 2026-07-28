import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import InsightsApp from './insights-app';

export default async function InsightsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }
  if (session.role !== 'Director' && session.role !== 'SVP') {
    redirect('/board');
  }

  return <InsightsApp session={session} />;
}
