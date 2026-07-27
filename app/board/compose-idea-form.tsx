'use client';

import { useState } from 'react';

export default function ComposeIdeaForm({
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

    setPosting(false);
    onPosted();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl"
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
