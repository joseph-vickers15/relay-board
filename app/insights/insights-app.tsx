'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SessionPayload } from '@/lib/types';
import IdeaCard, { IdeaItem } from '../board/idea-card';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  feedback_given: 'Feedback given',
  escalated: 'Escalated',
  implemented: 'Implemented',
  declined: 'Declined',
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never logged in';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// Fills in zero-count days so the chart doesn't have gaps for quiet days.
function fillLast30Days(rows: { day: string; count: string }[]) {
  const map = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const result: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key.slice(5), count: map.get(key) || 0 });
  }
  return result;
}

export default function InsightsApp({ session }: { session: SessionPayload }) {
  const [data, setData] = useState<any>(null);
  const [allIdeas, setAllIdeas] = useState<IdeaItem[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);

  function loadAllIdeas() {
    fetch('/api/insights/ideas')
      .then((res) => res.json())
      .then((d) => {
        setAllIdeas(d.ideas || []);
        setLoadingIdeas(false);
      });
  }

  useEffect(() => {
    fetch('/api/insights')
      .then((res) => res.json())
      .then(setData);
    loadAllIdeas();
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-playon-ink px-8 py-8 text-white">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  const logins = fillLast30Days(data.loginsByDay);
  const ideas = fillLast30Days(data.ideasByDay);
  const ackRate =
    data.announcementEngagement.total > 0
      ? Math.round(
          (Number(data.announcementEngagement.acknowledged) /
            Number(data.announcementEngagement.total)) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-playon-ink px-8 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/board" className="text-xs text-white/40 hover:text-white/70">
          ← Back to board
        </Link>
        <h1 className="mt-1 font-display text-xl font-bold">Insights</h1>
        <p className="text-xs text-white/40">How the org is actually using Relay Board.</p>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total people" value={data.totals.total_people} />
          <StatCard label="Active last 7 days" value={data.totals.active_last_7_days} />
          <StatCard label="Never logged in" value={data.totals.never_logged_in} warn />
          <StatCard label="Announcement ack rate" value={`${ackRate}%`} />
        </div>

        {/* Logins chart */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-sm font-bold text-white/90">
            Logins per day (last 30 days)
          </h2>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={logins}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#1FD3D9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ideas chart */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-sm font-bold text-white/90">
            Ideas submitted per day (last 30 days)
          </h2>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ideas}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#141416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#1FD3D9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Idea funnel */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-display text-sm font-bold text-white/90">Idea funnel</h2>
            <div className="mt-3 space-y-2">
              {['submitted', 'acknowledged', 'feedback_given', 'escalated', 'implemented', 'declined'].map(
                (status) => {
                  const row = data.ideaFunnel.find((r: any) => r.status === status);
                  return (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{STATUS_LABEL[status]}</span>
                      <span className="text-white/80">{row ? row.count : 0}</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Top contributors */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-display text-sm font-bold text-white/90">Top idea contributors</h2>
            <div className="mt-3 space-y-2">
              {data.topContributors.length === 0 && (
                <p className="text-xs text-white/30">No ideas submitted yet.</p>
              )}
              {data.topContributors.map((c: any) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{c.name}</span>
                  <span className="text-white/80">{c.idea_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category usage */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-sm font-bold text-white/90">
            Category usage (announcements filed)
          </h2>
          <div className="mt-3 space-y-2">
            {data.categoryUsage.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="text-white/60">{c.name}</span>
                <span className="text-white/80">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive people */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-sm font-bold text-white/90">
            Not logging in (14+ days, or never)
          </h2>
          <div className="mt-3 space-y-1.5">
            {data.inactivePeople.length === 0 && (
              <p className="text-xs text-white/30">Everyone has logged in recently. 🎉</p>
            )}
            {data.inactivePeople.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="text-white/70">
                  {p.name} <span className="text-white/30">· {p.role}</span>
                </span>
                <span className="text-white/40">{timeAgo(p.last_login)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* All open ideas, company-wide */}
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-white/90">
            All open ideas (oldest activity first)
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Read-only — a way to see what's in flight anywhere in the company, even
            on teams whose lead might be out or heads-down.
          </p>
          <div className="mt-3 space-y-3">
            {loadingIdeas && <p className="text-xs text-white/40">Loading…</p>}
            {!loadingIdeas && allIdeas.length === 0 && (
              <p className="text-xs text-white/30">No open ideas right now. 🎉</p>
            )}
            {!loadingIdeas &&
              allIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  myPersonId={session.personId}
                  onChanged={loadAllIdeas}
                  readOnly
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${warn ? 'text-playon-teal' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
