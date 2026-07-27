'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { SessionPayload } from '@/lib/types';

interface Person {
  id: string;
  name: string;
  role: string;
  manager_id: string | null;
  manager_name: string | null;
  must_change_password: boolean;
}

const ROLES = ['SVP', 'Director', 'Senior Manager', 'Manager', 'Tier 3', 'IC'];

export default function AdminApp({ session }: { session: SessionPayload }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('IC');
  const [newManagerId, setNewManagerId] = useState(session.personId);

  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/team');
    const data = await res.json();
    setPeople(data.people || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, role: newRole, managerId: newManagerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error || 'Something went wrong.');
      return;
    }
    setNewName('');
    setShowAdd(false);
    flash(`Added ${newName} with default password 1234.`);
    load();
  }

  async function handleResetPassword(person: Person) {
    if (!confirm(`Reset ${person.name}'s password back to 1234?`)) return;
    const res = await fetch(`/api/admin/people/${person.id}/reset-password`, { method: 'POST' });
    if (res.ok) {
      flash(`${person.name}'s password reset to 1234.`);
      load();
    }
  }

  async function handleMove(personId: string) {
    if (!moveTarget) return;
    const res = await fetch(`/api/admin/people/${personId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newManagerId: moveTarget }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error || 'Something went wrong.');
      return;
    }
    setMovingId(null);
    setMoveTarget('');
    flash('Moved successfully.');
    load();
  }

  return (
    <div className="min-h-screen bg-playon-ink px-8 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/board" className="text-xs text-white/40 hover:text-white/70">
              ← Back to board
            </Link>
            <h1 className="mt-1 font-display text-xl font-bold">Admin</h1>
            <p className="text-xs text-white/40">
              You can manage yourself and everyone below you in the org chart.
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark"
          >
            + Add team member
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded-lg bg-playon-teal/10 px-4 py-2 text-sm text-playon-teal">
            {message}
          </div>
        )}

        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="font-display text-sm font-bold text-white">New team member</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-white/40">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-playon-ink">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40">Reports to</label>
                <select
                  value={newManagerId}
                  onChange={(e) => setNewManagerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-playon-teal"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id} className="bg-playon-ink">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/30">
              New team members start with the password <span className="text-white/50">1234</span>{' '}
              and will be asked to set their own on first login.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-playon-teal px-4 py-2 text-sm font-semibold text-playon-ink hover:bg-playon-tealDark"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm text-white/40">Loading…</p>}

          {!loading &&
            people.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {person.name}{' '}
                    <span className="text-xs font-normal text-white/40">· {person.role}</span>
                  </p>
                  <p className="text-xs text-white/30">
                    Reports to {person.manager_name || '— (top of the org)'}
                    {person.must_change_password && (
                      <span className="ml-2 text-playon-teal">· still using default password</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {movingId === person.id ? (
                    <>
                      <select
                        value={moveTarget}
                        onChange={(e) => setMoveTarget(e.target.value)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="">— choose new manager —</option>
                        {people
                          .filter((p) => p.id !== person.id)
                          .map((p) => (
                            <option key={p.id} value={p.id} className="bg-playon-ink">
                              {p.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleMove(person.id)}
                        className="rounded-lg bg-playon-teal px-3 py-1.5 text-xs font-semibold text-playon-ink hover:bg-playon-tealDark"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setMovingId(null);
                          setMoveTarget('');
                        }}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setMovingId(person.id)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                      >
                        Move
                      </button>
                      <button
                        onClick={() => handleResetPassword(person)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                      >
                        Reset password
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
