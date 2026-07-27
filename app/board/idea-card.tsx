'use client';

import { useState } from 'react';

export interface IdeaEvent {
  id: number;
  event_type: string;
  note: string | null;
  created_at: string;
  actor_name: string;
  actor_role: string;
}

export interface IdeaItem {
  id: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_role: string;
  current_owner_id: string | null;
  current_owner_name: string | null;
  current_owner_role: string | null;
  escalate_to_name: string | null;
  is_following: boolean;
  events: IdeaEvent[];
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  feedback_given: 'Feedback given',
  escalated: 'Escalated',
  implemented: 'Implemented',
  declined: 'Declined',
};

const DECISION_ROLES = ['Director', 'SVP'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IdeaCard({
  idea,
  myPersonId,
  onChanged,
}: {
  idea: IdeaItem;
  myPersonId: string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeForm, setActiveForm] = useState<
    'feedback' | 'escalate' | 'implement' | 'decline' | null
  >(null);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(idea.is_following);

  const isMyAction = idea.current_owner_id === myPersonId;
  const isClosed = idea.status === 'implemented' || idea.status === 'declined';
  const canDecide = DECISION_ROLES.includes(idea.current_owner_role || '');

  async function runAction(action: string, note?: string) {
    setBusy(true);
    const res = await fetch(`/api/ideas/${idea.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    setBusy(false);
    if (res.ok) {
      setActiveForm(null);
      setNoteText('');
      onChanged();
    }
  }

  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    await fetch(`/api/ideas/${idea.id}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follow: next }),
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{idea.title}</h3>
          <p className="mt-0.5 text-xs text-white/40">
            {idea.author_name} · {idea.author_role} · {timeAgo(idea.created_at)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
          {STATUS_LABEL[idea.status] || idea.status}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{idea.body}</p>

      {!isClosed && idea.current_owner_name && (
        <p className="mt-2 text-xs text-white/40">
          Currently with <span className="text-white/70">{idea.current_owner_name}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          {expanded ? 'Hide timeline' : `Timeline (${idea.events.length})`}
        </button>

        <button
          onClick={toggleFollow}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          {following ? 'Following' : 'Follow'}
        </button>

        {isMyAction && !isClosed && (
          <>
            {idea.status === 'submitted' && (
              <button
                onClick={() => runAction('acknowledge')}
                disabled={busy}
                className="rounded-lg bg-playon-teal px-3 py-1.5 text-xs font-semibold text-playon-ink hover:bg-playon-tealDark disabled:opacity-50"
              >
                Acknowledge
              </button>
            )}
            <button
              onClick={() => setActiveForm(activeForm === 'feedback' ? null : 'feedback')}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              Give feedback
            </button>
            {idea.escalate_to_name && (
              <button
                onClick={() => setActiveForm(activeForm === 'escalate' ? null : 'escalate')}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
              >
                Escalate to {idea.escalate_to_name}
              </button>
            )}
            {canDecide && (
              <>
                <button
                  onClick={() => setActiveForm(activeForm === 'implement' ? null : 'implement')}
                  className="rounded-lg border border-playon-teal/40 px-3 py-1.5 text-xs text-playon-teal hover:bg-playon-teal/10"
                >
                  Mark implemented
                </button>
                <button
                  onClick={() => setActiveForm(activeForm === 'decline' ? null : 'decline')}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/50 hover:bg-white/5"
                >
                  Decline
                </button>
              </>
            )}
          </>
        )}
      </div>

      {activeForm && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={
              activeForm === 'feedback'
                ? 'Your feedback (required)…'
                : 'Optional note…'
            }
            rows={3}
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-playon-teal"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setActiveForm(null);
                setNoteText('');
              }}
              className="rounded-md px-3 py-1 text-xs text-white/50 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => runAction(activeForm, noteText)}
              disabled={busy || (activeForm === 'feedback' && !noteText.trim())}
              className="rounded-md bg-playon-teal px-3 py-1 text-xs font-semibold text-playon-ink hover:bg-playon-tealDark disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{idea.author_name} submitted this idea</span>
            <span>{timeAgo(idea.created_at)}</span>
          </div>
          {idea.events.map((event) => (
            <div key={event.id} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-white/60">
                <span>
                  <span className="text-white/80">{event.actor_name}</span>{' '}
                  {STATUS_LABEL[event.event_type]?.toLowerCase() || event.event_type}
                </span>
                <span className="text-white/30">{timeAgo(event.created_at)}</span>
              </div>
              {event.note && <p className="mt-1 text-white/70">{event.note}</p>}
            </div>
          ))}
          {idea.events.length === 0 && (
            <p className="text-xs text-white/30">No activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
