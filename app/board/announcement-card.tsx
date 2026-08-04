'use client';

import { useState } from 'react';
import { getTagColor } from '@/lib/tagColors';
import { BodyContent } from '@/lib/renderBody';

export interface AnnouncementAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  content_type: string | null;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_role: string;
  acknowledged_at?: string | null;
  attachments?: AnnouncementAttachment[];
  tag?: string | null;
}

export interface Category {
  id: number;
  name: string;
  filed_count: number;
  created_by?: string;
  is_default?: boolean;
}

interface StatsBreakdownRow {
  root_id: string;
  root_name: string;
  total: string;
  acknowledged: string;
  root_acknowledged: boolean;
}

interface StatsMember {
  root_id: string;
  id: string;
  name: string;
  role: string;
  acknowledged_at: string | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TagBadge({ tag }: { tag: string }) {
  const color = getTagColor(tag);
  return (
    <span
      className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}26`, color }}
    >
      {tag}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnnouncementCard({
  item,
  categories,
  isAuthorView,
  canDelete,
  onAcknowledged,
  onFiled,
  onDeleted,
}: {
  item: AnnouncementItem;
  categories: Category[];
  isAuthorView: boolean;
  canDelete?: boolean;
  onAcknowledged?: (id: number) => void;
  onFiled?: (id: number) => void;
  onDeleted?: (id: number) => void;
}) {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<{
    overall: { total: string; acknowledged: string };
    breakdown: StatsBreakdownRow[];
    members: StatsMember[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [acking, setAcking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      onDeleted?.(item.id);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not delete this announcement.');
    }
  }

  async function handleAcknowledge() {
    setAcking(true);
    await fetch(`/api/announcements/${item.id}/acknowledge`, { method: 'POST' });
    setAcking(false);
    onAcknowledged?.(item.id);
  }

  async function handleFile(categoryId: number) {
    setShowFileMenu(false);
    await fetch(`/api/announcements/${item.id}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    });
    onFiled?.(item.id);
  }

  async function toggleStats() {
    if (showStats) {
      setShowStats(false);
      return;
    }
    setShowStats(true);
    if (!stats) {
      setLoadingStats(true);
      const res = await fetch(`/api/announcements/${item.id}/stats`);
      const data = await res.json();
      setStats(data);
      setLoadingStats(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
          <p className="mt-0.5 text-xs text-white/40">
            {item.author_name} · {item.author_role} · {timeAgo(item.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {item.tag && <TagBadge tag={item.tag} />}
          {!isAuthorView && item.acknowledged_at && (
            <span className="rounded-full bg-playon-teal/15 px-3 py-1 text-xs font-medium text-playon-teal">
              Acknowledged
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm text-white/80">
        <BodyContent body={item.body} />
      </div>

      {item.attachments && item.attachments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {item.attachments.map((file) => (
            <a
              key={file.id}
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              <span className="truncate">📎 {file.file_name}</span>
              <span className="shrink-0 text-white/30">{formatSize(file.file_size)}</span>
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isAuthorView && !item.acknowledged_at && (
          <button
            onClick={handleAcknowledge}
            disabled={acking}
            className="rounded-lg bg-playon-teal px-3 py-1.5 text-xs font-semibold text-playon-ink hover:bg-playon-tealDark disabled:opacity-50"
          >
            {acking ? 'Marking…' : 'Acknowledge'}
          </button>
        )}

        {!isAuthorView && (
          <div className="relative">
            <button
              onClick={() => setShowFileMenu((v) => !v)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              File into…
            </button>
            {showFileMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 w-44 rounded-lg border border-white/10 bg-[#141416] p-1 shadow-xl">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleFile(c.id)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isAuthorView && (
          <button
            onClick={toggleStats}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            {showStats ? 'Hide acknowledgments' : 'View acknowledgments'}
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>

      {showStats && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {loadingStats || !stats ? (
            <p className="text-xs text-white/40">Loading…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-white/80">
                {stats.overall.acknowledged} / {stats.overall.total} acknowledged overall
              </p>
              <div className="mt-2 space-y-1.5">
                {stats.breakdown.map((row) => (
                  <div key={row.root_id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTeam(expandedTeam === row.root_id ? null : row.root_id)
                      }
                      className="flex w-full items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                    >
                      <span className="text-white/70">
                        {expandedTeam === row.root_id ? '▾' : '▸'} {row.root_name}{' '}
                        {row.root_acknowledged ? (
                          <span className="text-playon-teal">(acknowledged)</span>
                        ) : (
                          <span className="text-white/30">(not yet)</span>
                        )}
                      </span>
                      <span className="text-white/50">
                        {row.acknowledged} / {row.total}
                      </span>
                    </button>

                    {expandedTeam === row.root_id && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                        {stats.members
                          .filter((m) => m.root_id === row.root_id)
                          .map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between px-2 py-1 text-xs"
                            >
                              <span className="text-white/60">
                                {m.name} <span className="text-white/25">· {m.role}</span>
                              </span>
                              {m.acknowledged_at ? (
                                <span className="text-playon-teal">Acknowledged</span>
                              ) : (
                                <span className="text-white/30">Not yet</span>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
