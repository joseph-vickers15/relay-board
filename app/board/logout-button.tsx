'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
    >
      Log out
    </button>
  );
}
