'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PersonOption {
  id: string;
  name: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments || []));
  }, []);

  useEffect(() => {
    setSelectedId('');
    if (!selectedDeptId) {
      setPeople([]);
      return;
    }
    fetch(`/api/people?departmentId=${selectedDeptId}`)
      .then((res) => res.json())
      .then((data) => setPeople(data.people || []));
  }, [selectedDeptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: selectedId, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      router.push(data.mustChangePassword ? '/change-password' : '/board');
    } catch {
      setError('Could not reach the server. Try again.');
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-playon-ink text-white">
      {/* Signature background element: the real PlayOn arrow, repeated
          faintly, echoing the idea of a message passing hand to hand */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <div className="flex gap-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="90" height="90" viewBox="0 0 24 24" fill="none">
              <path d="M3 21L21 3L12 10L3 10Z" fill="#1FD3D9" />
            </svg>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-10 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 21L21 3L12 10L3 10Z" fill="#1FD3D9" />
          </svg>
          <span className="font-display text-xl font-bold tracking-tight">
            Relay Board
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur"
        >
          <h1 className="font-display text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-white/50">
            Select your name to get started.
          </p>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-white/40">
            Department
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-playon-teal focus:ring-1 focus:ring-playon-teal"
          >
            <option value="" disabled>
              — Choose your department —
            </option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id} className="bg-playon-ink">
                {dept.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
            Your name
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            disabled={!selectedDeptId}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-playon-teal focus:ring-1 focus:ring-playon-teal disabled:opacity-40"
          >
            <option value="" disabled>
              {selectedDeptId ? '— Choose your name —' : '— Pick a department first —'}
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id} className="bg-playon-ink">
                {person.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-white/40">
            Password
          </label>
          <div className="relative mt-2">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Default password is 1234"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-playon-teal focus:ring-1 focus:ring-playon-teal"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/70"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-playon-teal py-2.5 text-sm font-semibold text-playon-ink transition hover:bg-playon-tealDark disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Continue to Board'}
          </button>

          <p className="mt-4 text-center text-xs text-white/30">
            Forgot your password? Ask your manager to reset it.
          </p>
        </form>
      </div>
    </main>
  );
}
