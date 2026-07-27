'use client';

import { useState, useEffect } from 'react';

interface AudiencePerson {
  id: string;
  name: string;
  role: string;
}

type LeaderPreset = 'managers' | 'managers_and_ics' | 'custom';

export default function ComposeForm({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const [loadingAudience, setLoadingAudience] = useState(true);
  const [mode, setMode] = useState<'direct' | 'leader' | 'fixed' | 'none'>('none');
  const [people, setPeople] = useState<AudiencePerson[]>([]);
  const [icCount, setIcCount] = useState(0);

  // Manager/Senior Manager: checked set of their direct reports (default: all)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Director/SVP: preset choice, plus custom checked set when "custom"
  const [leaderPreset, setLeaderPreset] = useState<LeaderPreset>('managers_and_ics');
  const [leaderCheckedIds, setLeaderCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/announcements/audience')
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode);
        if (data.mode === 'direct') {
          setPeople(data.people);
          setCheckedIds(new Set(data.people.map((p: AudiencePerson) => p.id)));
        } else if (data.mode === 'leader') {
          setPeople(data.people);
        } else if (data.mode === 'fixed') {
          setIcCount(data.icCount);
        }
        setLoadingAudience(false);
      });
  }, []);

  function toggleDirect(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLeaderCustom(id: string) {
    setLeaderCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function computeRecipientIds(): string[] {
    if (mode === 'direct') {
      return Array.from(checkedIds);
    }
    if (mode === 'leader') {
      if (leaderPreset === 'managers') {
        return people.filter((p) => p.role === 'Manager' || p.role === 'Senior Manager').map((p) => p.id);
      }
      if (leaderPreset === 'managers_and_ics') {
        return people
          .filter((p) => p.role === 'Manager' || p.role === 'Senior Manager' || p.role === 'IC')
          .map((p) => p.id);
      }
      return Array.from(leaderCheckedIds);
    }
    return []; // 'fixed' mode: server computes recipients itself
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const recipientIds = computeRecipientIds();
    if (mode !== 'fixed' && recipientIds.length === 0) {
      setError('Select at least one recipient.');
      return;
    }

    setPosting(true);
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, recipientIds }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Something went wrong.');
      setPosting(false);
      return;
    }

    setPosting(false);
    onPosted();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl"
      >
        <h2 className="font-display text-lg font-bold text-white">New announcement</h2>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal focus:ring-1 focus:ring-playon-teal"
        />

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-white/40">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal focus:ring-1 focus:ring-playon-teal"
        />

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
          Send to
        </label>

        {loadingAudience && <p className="mt-2 text-xs text-white/40">Loading…</p>}

        {!loadingAudience && mode === 'fixed' && (
          <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
            This always goes to every IC in the company ({icCount} people).
          </p>
        )}

        {!loadingAudience && mode === 'direct' && (
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[10px] text-white/30">Defaults to your whole team</span>
              <button
                type="button"
                onClick={() => setCheckedIds(new Set(people.map((p) => p.id)))}
                className="text-[10px] text-playon-teal hover:underline"
              >
                Select all
              </button>
            </div>
            {people.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(p.id)}
                  onChange={() => toggleDirect(p.id)}
                  className="accent-playon-teal"
                />
                {p.name}
              </label>
            ))}
          </div>
        )}

        {!loadingAudience && mode === 'leader' && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['managers', 'All Managers'],
                  ['managers_and_ics', 'All Managers and ICs'],
                  ['custom', 'Choose specific people'],
                ] as [LeaderPreset, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLeaderPreset(value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    leaderPreset === value
                      ? 'border-playon-teal bg-playon-teal/10 text-playon-teal'
                      : 'border-white/15 text-white/60 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {leaderPreset === 'custom' && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
                {people.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={leaderCheckedIds.has(p.id)}
                        onChange={() => toggleLeaderCustom(p.id)}
                        className="accent-playon-teal"
                      />
                      {p.name}
                    </span>
                    <span className="text-[10px] text-white/30">{p.role}</span>
                  </label>
                ))}
              </div>
            )}

            {leaderPreset !== 'custom' && (
              <p className="text-[10px] text-white/30">
                {leaderPreset === 'managers'
                  ? `${people.filter((p) => p.role === 'Manager' || p.role === 'Senior Manager').length} managers will receive this.`
                  : `${
                      people.filter(
                        (p) => p.role === 'Manager' || p.role === 'Senior Manager' || p.role === 'IC'
                      ).length
                    } people will receive this.`}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={posting || loadingAudience}
            className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark disabled:opacity-50"
          >
            {posting ? 'Sending…' : 'Send announcement'}
          </button>
        </div>
      </form>
    </div>
  );
}
