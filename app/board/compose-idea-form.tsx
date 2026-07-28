'use client';

import { useState } from 'react';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL } from '@/lib/attachments';

export default function ComposeIdeaForm({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPosting(true);

    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Something went wrong.');
      setPosting(false);
      return;
    }

    const data = await res.json();

    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      await fetch(`/api/ideas/${data.id}/attachments`, {
        method: 'POST',
        body: form,
      });
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
        <h2 className="font-display text-lg font-bold text-white">Submit an idea</h2>
        <p className="mt-1 text-xs text-white/40">
          This goes to your manager first. They can acknowledge it, give feedback, or
          escalate it up the chain.
        </p>

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
          Describe your idea
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal focus:ring-1 focus:ring-playon-teal"
        />

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
            disabled={posting}
            className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark disabled:opacity-50"
          >
            {posting ? 'Submitting…' : 'Submit idea'}
          </button>
        </div>
      </form>
    </div>
  );
}
