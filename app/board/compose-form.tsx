'use client';

import { useState, useEffect } from 'react';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL } from '@/lib/attachments';
import { getTagColor } from '@/lib/tagColors';
import type { Category } from './announcement-card';

interface AudiencePerson {
  id: string;
  name: string;
  role: string;
}

type LeaderPreset = 'managers' | 'managers_and_ics' | 'everyone' | 'custom';

export default function ComposeForm({
  categories,
  onClose,
  onPosted,
}: {
  categories: Category[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [insertingImage, setInsertingImage] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const tagOptions = [...categories.map((c) => c.name), 'Action Required'];

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
          .filter((p) => p.role === 'Manager' || p.role === 'Senior Manager' || p.role === 'IC' || p.role === 'Senior IC')
          .map((p) => p.id);
      }
      if (leaderPreset === 'everyone') {
        return people.map((p) => p.id);
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
      body: JSON.stringify({ title, body, recipientIds, tag }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Something went wrong.');
      setPosting(false);
      return;
    }

    const data = await res.json();
    const uploadErrors: string[] = [];

    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`/api/announcements/${data.id}/attachments`, {
        method: 'POST',
        body: form,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => ({}));
        uploadErrors.push(`${file.name}: ${uploadData.error || 'upload failed'}`);
      }
    }

    setPosting(false);

    if (uploadErrors.length > 0) {
      setError(
        `Announcement sent, but some attachments failed:\n${uploadErrors.join('\n')}`
      );
      return;
    }

    onPosted();
  }

  function handleInsertLink() {
    const text = linkText.trim() || linkUrl.trim();
    let url = linkUrl.trim();
    if (!url) {
      setError('Enter a URL to link to.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setError('');
    setBody((prev) => (prev && !prev.endsWith('\n') ? prev + '\n' : prev) + `[${text}](${url})\n`);
    setLinkText('');
    setLinkUrl('');
    setShowLinkForm(false);
  }

  async function handleInsertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(`Image is too large. Max size is ${MAX_ATTACHMENT_SIZE_LABEL}.`);
      return;
    }
    setError('');
    setInsertingImage(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads/inline-image', { method: 'POST', body: form });
    setInsertingImage(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Image upload failed.');
      return;
    }
    const data = await res.json();
    setBody((prev) => (prev && !prev.endsWith('\n') ? prev + '\n' : prev) + `![image](${data.url})\n`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const tooBig = selected.find((f) => f.size > MAX_ATTACHMENT_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large. Max size is ${MAX_ATTACHMENT_SIZE_LABEL}.`);
      return;
    }
    setError('');
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
        <div className="mt-1.5 flex items-center gap-3">
          <label className="cursor-pointer text-xs text-playon-teal hover:underline">
            {insertingImage ? 'Uploading…' : '+ Insert image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleInsertImage}
              disabled={insertingImage}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowLinkForm((v) => !v)}
            className="text-xs text-playon-teal hover:underline"
          >
            + Insert link
          </button>
        </div>
        <p className="mt-1 text-xs text-white/25">
          Images show up inline. Pasting a plain link also becomes clickable automatically.
        </p>

        {showLinkForm && (
          <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text (e.g. Sign-up form)"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-playon-teal"
              />
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-playon-teal"
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="rounded-md px-3 py-1 text-xs text-white/50 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="rounded-md bg-playon-teal px-3 py-1 text-xs font-semibold text-playon-ink hover:bg-playon-tealDark"
              >
                Insert
              </button>
            </div>
          </div>
        )}

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-white/40">
          Attachments <span className="normal-case text-white/25">(optional, max {MAX_ATTACHMENT_SIZE_LABEL} each)</span>
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="mt-1.5 block w-full text-xs text-white/60 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white/80 hover:file:bg-white/15"
        />
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1 text-xs text-white/70"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-2 shrink-0 text-white/40 hover:text-white/70"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
          Send to
        </label>

        {loadingAudience && <p className="mt-2 text-xs text-white/40">Loading…</p>}

        {!loadingAudience && mode === 'fixed' && (
          <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
            This always goes to everyone in the company ({icCount} people).
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
                  ['everyone', 'Everyone'],
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
                {leaderPreset === 'managers' &&
                  `${people.filter((p) => p.role === 'Manager' || p.role === 'Senior Manager').length} managers will receive this.`}
                {leaderPreset === 'managers_and_ics' &&
                  `${
                    people.filter(
                      (p) => p.role === 'Manager' || p.role === 'Senior Manager' || p.role === 'IC' || p.role === 'Senior IC'
                    ).length
                  } people will receive this.`}
                {leaderPreset === 'everyone' &&
                  `${people.length} people will receive this — every role below you, including Tier 3.`}
              </p>
            )}
          </div>
        )}

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
          Tag <span className="normal-case text-white/25">(optional — shows as a colored label)</span>
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tagOptions.map((option) => {
            const color = getTagColor(option);
            const selected = tag === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setTag(selected ? null : option)}
                className="rounded-full px-3 py-1 text-xs font-medium transition"
                style={{
                  backgroundColor: selected ? `${color}40` : `${color}15`,
                  color,
                  outline: selected ? `1px solid ${color}` : 'none',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
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
