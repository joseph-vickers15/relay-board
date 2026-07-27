'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SessionPayload } from '@/lib/types';
import LogoutButton from './logout-button';
import AnnouncementCard, { AnnouncementItem, Category } from './announcement-card';
import ComposeForm from './compose-form';

type View = { type: 'inbox' } | { type: 'sent' } | { type: 'category'; id: number; name: string };

export default function BoardApp({ session }: { session: SessionPayload }) {
  const [view, setView] = useState<View>({ type: 'inbox' });
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [canCompose, setCanCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadSummary = useCallback(async () => {
    const [summaryRes, categoriesRes] = await Promise.all([
      fetch('/api/board'),
      fetch('/api/categories'),
    ]);
    const summary = await summaryRes.json();
    const categoriesData = await categoriesRes.json();
    setInboxCount(summary.inboxCount);
    setCanCompose(summary.canCompose);
    setCategories(categoriesData.categories);
  }, []);

  const loadItems = useCallback(async (currentView: View) => {
    setLoading(true);
    let url = '/api/announcements?scope=inbox';
    if (currentView.type === 'sent') url = '/api/announcements?scope=sent';
    if (currentView.type === 'category')
      url = `/api/announcements?scope=category&categoryId=${currentView.id}`;

    const res = await fetch(url);
    const data = await res.json();
    setItems(data.announcements);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadItems(view);
  }, [view, loadItems]);

  function refreshAfterAction() {
    loadItems(view);
    loadSummary();
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    setNewCategoryName('');
    setShowNewCategory(false);
    loadSummary();
  }

  const viewTitle =
    view.type === 'inbox' ? 'Inbox' : view.type === 'sent' ? 'Sent by me' : view.name;

  return (
    <div className="flex min-h-screen bg-playon-ink text-white">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/10 p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M2 12L20 2L14 12L20 22L2 12Z" fill="#1FD3D9" />
          </svg>
          <span className="font-display text-sm font-bold">Relay Board</span>
        </div>

        <nav className="space-y-0.5">
          <button
            onClick={() => setView({ type: 'inbox' })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
              view.type === 'inbox' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <span>Inbox</span>
            {inboxCount > 0 && (
              <span className="rounded-full bg-playon-teal px-1.5 py-0.5 text-[10px] font-semibold text-playon-ink">
                {inboxCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setView({ type: 'sent' })}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
              view.type === 'sent' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
            }`}
          >
            Sent by me
          </button>

          <p className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Categories
          </p>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setView({ type: 'category', id: c.id, name: c.name })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                view.type === 'category' && view.id === c.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <span>{c.name}</span>
              {c.filed_count > 0 && (
                <span className="text-[10px] text-white/40">{c.filed_count}</span>
              )}
            </button>
          ))}

          {showNewCategory ? (
            <form onSubmit={handleCreateCategory} className="px-3 pt-1">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onBlur={() => !newCategoryName && setShowNewCategory(false)}
                placeholder="Category name"
                className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-playon-teal"
              />
            </form>
          ) : (
            <button
              onClick={() => setShowNewCategory(true)}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/40 hover:bg-white/5 hover:text-white/60"
            >
              + New category
            </button>
          )}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Signed in as</p>
              <h1 className="font-display text-xl font-bold">
                {session.name} <span className="text-white/40">· {session.role}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {canCompose && (
                <button
                  onClick={() => setShowCompose(true)}
                  className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark"
                >
                  New announcement
                </button>
              )}
              <LogoutButton />
            </div>
          </div>

          <h2 className="mt-8 font-display text-lg font-bold text-white/90">{viewTitle}</h2>

          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-white/40">Loading…</p>}

            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
                Nothing here right now.
              </div>
            )}

            {!loading &&
              items.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  isAuthorView={view.type === 'sent'}
                  onAcknowledged={refreshAfterAction}
                  onFiled={refreshAfterAction}
                />
              ))}
          </div>
        </div>
      </main>

      {showCompose && (
        <ComposeForm
          onClose={() => setShowCompose(false)}
          onPosted={() => {
            setShowCompose(false);
            refreshAfterAction();
          }}
        />
      )}
    </div>
  );
}
