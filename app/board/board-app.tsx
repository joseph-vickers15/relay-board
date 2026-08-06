'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { SessionPayload } from '@/lib/types';
import LogoutButton from './logout-button';
import AnnouncementCard, { AnnouncementItem, Category } from './announcement-card';
import ComposeForm from './compose-form';
import IdeaCard, { IdeaItem } from './idea-card';
import ComposeIdeaForm from './compose-idea-form';

type Mode = 'announcements' | 'ideas';
type AnnouncementView =
  | { type: 'inbox' }
  | { type: 'sent' }
  | { type: 'all-org' }
  | { type: 'category'; id: number; name: string };
type IdeaView = 'mine' | 'action' | 'following' | 'implemented';

export default function BoardApp({ session }: { session: SessionPayload }) {
  const [mode, setMode] = useState<Mode>('announcements');

  // --- Announcements state ---
  const [annView, setAnnView] = useState<AnnouncementView>({ type: 'inbox' });
  const [annItems, setAnnItems] = useState<AnnouncementItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [canCompose, setCanCompose] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [annSort, setAnnSort] = useState<'newest' | 'oldest'>('newest');
  const [annSearch, setAnnSearch] = useState('');

  // --- Ideas state ---
  const [ideaView, setIdeaView] = useState<IdeaView>('mine');
  const [ideaItems, setIdeaItems] = useState<IdeaItem[]>([]);
  const [ideaActionCount, setIdeaActionCount] = useState(0);
  const [showComposeIdea, setShowComposeIdea] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadAnnSummary = useCallback(async () => {
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

  const loadAnnItems = useCallback(
    async (view: AnnouncementView, sort: 'newest' | 'oldest', search: string) => {
      setLoading(true);
      let url = `/api/announcements?scope=inbox&sort=${sort}&q=${encodeURIComponent(search)}`;
      if (view.type === 'sent') url = `/api/announcements?scope=sent&sort=${sort}&q=${encodeURIComponent(search)}`;
      if (view.type === 'all-org') url = `/api/announcements/all-org?sort=${sort}&q=${encodeURIComponent(search)}`;
      if (view.type === 'category')
        url = `/api/announcements?scope=category&categoryId=${view.id}&sort=${sort}&q=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setAnnItems(data.announcements);
      setLoading(false);
    },
    []
  );

  const loadIdeaSummary = useCallback(async () => {
    const res = await fetch('/api/ideas/summary');
    const data = await res.json();
    setIdeaActionCount(data.needsActionCount);
  }, []);

  const loadIdeaItems = useCallback(async (view: IdeaView) => {
    setLoading(true);
    const res = await fetch(`/api/ideas?scope=${view}`);
    const data = await res.json();
    setIdeaItems(data.ideas);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnnSummary();
    loadIdeaSummary();
  }, [loadAnnSummary, loadIdeaSummary]);

  useEffect(() => {
    if (mode !== 'announcements') return;
    const timeout = setTimeout(() => {
      loadAnnItems(annView, annSort, annSearch);
    }, 250);
    return () => clearTimeout(timeout);
  }, [mode, annView, annSort, annSearch, loadAnnItems]);

  useEffect(() => {
    if (mode === 'ideas') loadIdeaItems(ideaView);
  }, [mode, ideaView, loadIdeaItems]);

  function selectAnnView(view: AnnouncementView) {
    setAnnSearch('');
    setAnnView(view);
  }

  function refreshAnnouncements() {
    loadAnnItems(annView, annSort, annSearch);
    loadAnnSummary();
  }

  function refreshIdeas() {
    loadIdeaItems(ideaView);
    loadIdeaSummary();
  }

  function canManageCategory(c: Category): boolean {
    if (session.role === 'Director' || session.role === 'SVP') return true;
    return !c.is_default && c.created_by === session.personId;
  }

  async function handleRenameCategory(c: Category) {
    const trimmed = editCategoryName.trim();
    setEditingCategoryId(null);
    if (!trimmed || trimmed === c.name) return;
    await fetch(`/api/categories/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    loadAnnSummary();
  }

  async function handleDeleteCategory(c: Category) {
    if (
      !confirm(
        `Delete category "${c.name}"? Anything anyone has filed here moves back to their Inbox. This can't be undone.`
      )
    )
      return;
    await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
    if (annView.type === 'category' && annView.id === c.id) {
      selectAnnView({ type: 'inbox' });
    }
    loadAnnSummary();
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
    loadAnnSummary();
  }

  const canSubmitIdea = session.role !== 'SVP';

  const annViewTitle =
    annView.type === 'inbox'
      ? 'Inbox'
      : annView.type === 'sent'
      ? 'Sent by me'
      : annView.type === 'all-org'
      ? 'All announcements (company-wide)'
      : annView.name;

  const ideaViewTitle =
    ideaView === 'mine'
      ? 'My ideas'
      : ideaView === 'action'
      ? 'Needs my action'
      : ideaView === 'implemented'
      ? 'Implemented (company-wide)'
      : 'Following';

  return (
    <div className="flex min-h-screen bg-playon-ink text-white">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/10 p-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 21L21 3L12 10L3 10Z" fill="#1FD3D9" />
          </svg>
          <span className="font-display text-sm font-bold">Relay Board</span>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-lg bg-white/5 p-1 text-xs">
          <button
            onClick={() => setMode('announcements')}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              mode === 'announcements' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setMode('ideas')}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              mode === 'ideas' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Ideas
            {ideaActionCount > 0 && (
              <span className="ml-1 rounded-full bg-playon-teal px-1.5 py-0.5 text-[9px] font-semibold text-playon-ink">
                {ideaActionCount}
              </span>
            )}
          </button>
        </div>

        {mode === 'announcements' ? (
          <nav className="space-y-0.5">
            <button
              onClick={() => selectAnnView({ type: 'inbox' })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                annView.type === 'inbox' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
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
              onClick={() => selectAnnView({ type: 'sent' })}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
                annView.type === 'sent' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              Sent by me
            </button>

            {(session.role === 'Director' || session.role === 'SVP' || session.isSuperAdmin) && (
              <button
                onClick={() => selectAnnView({ type: 'all-org' })}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
                  annView.type === 'all-org' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                All announcements
              </button>
            )}

            <p className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/30">
              Categories
            </p>
            {categories.map((c) =>
              editingCategoryId === c.id ? (
                <form
                  key={c.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRenameCategory(c);
                  }}
                  className="px-3 py-1"
                >
                  <input
                    autoFocus
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onBlur={() => handleRenameCategory(c)}
                    className="w-full rounded-md border border-playon-teal bg-white/5 px-2 py-1 text-xs text-white outline-none"
                  />
                </form>
              ) : (
                <div key={c.id} className="group flex items-center rounded-lg hover:bg-white/5">
                  <button
                    onClick={() => selectAnnView({ type: 'category', id: c.id, name: c.name })}
                    className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      annView.type === 'category' && annView.id === c.id
                        ? 'bg-white/10 text-white'
                        : 'text-white/60'
                    }`}
                  >
                    <span>{c.name}</span>
                    {c.filed_count > 0 && (
                      <span className="text-[10px] text-white/40">{c.filed_count}</span>
                    )}
                  </button>
                  {canManageCategory(c) && (
                    <div className="hidden shrink-0 items-center gap-0.5 pr-2 group-hover:flex">
                      <button
                        title="Rename"
                        onClick={() => {
                          setEditingCategoryId(c.id);
                          setEditCategoryName(c.name);
                        }}
                        className="rounded p-1 text-white/30 hover:text-white/70"
                      >
                        ✎
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDeleteCategory(c)}
                        className="rounded p-1 text-white/30 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )
            )}

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
        ) : (
          <nav className="space-y-0.5">
            <button
              onClick={() => setIdeaView('action')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                ideaView === 'action' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <span>Needs my action</span>
              {ideaActionCount > 0 && (
                <span className="rounded-full bg-playon-teal px-1.5 py-0.5 text-[10px] font-semibold text-playon-ink">
                  {ideaActionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIdeaView('mine')}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
                ideaView === 'mine' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              My ideas
            </button>
            <button
              onClick={() => setIdeaView('following')}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
                ideaView === 'following' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setIdeaView('implemented')}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm ${
                ideaView === 'implemented' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              Implemented
            </button>
          </nav>
        )}
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
              {mode === 'announcements' && canCompose && (
                <button
                  onClick={() => setShowCompose(true)}
                  className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark"
                >
                  New announcement
                </button>
              )}
              {mode === 'ideas' && canSubmitIdea && (
                <button
                  onClick={() => setShowComposeIdea(true)}
                  className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark"
                >
                  New idea
                </button>
              )}
              {canCompose && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  Admin
                </Link>
              )}
              {(session.role === 'Director' || session.role === 'SVP' || session.isSuperAdmin) && (
                <Link
                  href="/insights"
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  Insights
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>

          <h2 className="mt-8 font-display text-lg font-bold text-white/90">
            {mode === 'announcements' ? annViewTitle : ideaViewTitle}
          </h2>

          {mode === 'announcements' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={annSearch}
                onChange={(e) => setAnnSearch(e.target.value)}
                placeholder="Search title or message…"
                className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-playon-teal"
              />
              <div className="flex rounded-lg bg-white/5 p-0.5 text-xs">
                <button
                  onClick={() => setAnnSort('newest')}
                  className={`rounded-md px-2.5 py-1 ${
                    annSort === 'newest' ? 'bg-white/15 text-white' : 'text-white/50'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setAnnSort('oldest')}
                  className={`rounded-md px-2.5 py-1 ${
                    annSort === 'oldest' ? 'bg-white/15 text-white' : 'text-white/50'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-white/40">Loading…</p>}

            {mode === 'announcements' && !loading && annItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
                Nothing here right now.
              </div>
            )}

            {mode === 'announcements' &&
              !loading &&
              annItems.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  isAuthorView={annView.type === 'sent' || annView.type === 'all-org'}
                  canDelete={
                    item.author_id === session.personId ||
                    session.role === 'Director' ||
                    session.role === 'SVP'
                  }
                  onAcknowledged={refreshAnnouncements}
                  onFiled={refreshAnnouncements}
                  onDeleted={refreshAnnouncements}
                />
              ))}

            {mode === 'ideas' && !loading && ideaItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
                Nothing here right now.
              </div>
            )}

            {mode === 'ideas' &&
              !loading &&
              ideaItems.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  myPersonId={session.personId}
                  onChanged={refreshIdeas}
                />
              ))}
          </div>
        </div>
      </main>

      {showCompose && (
        <ComposeForm
          categories={categories}
          onClose={() => setShowCompose(false)}
          onPosted={() => {
            setShowCompose(false);
            refreshAnnouncements();
          }}
        />
      )}

      {showComposeIdea && (
        <ComposeIdeaForm
          onClose={() => setShowComposeIdea(false)}
          onPosted={() => {
            setShowComposeIdea(false);
            setIdeaView('mine');
            refreshIdeas();
          }}
        />
      )}
    </div>
  );
}
