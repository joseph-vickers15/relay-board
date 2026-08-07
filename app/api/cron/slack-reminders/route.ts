import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { lookupSlackUserByEmail, sendSlackDM } from '@/lib/slack';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Hobby plan's actual function limit

const APP_URL = process.env.APP_URL || 'https://relay-board-yh6q.vercel.app';

// Vercel Hobby cron entries can only run once a day each (see vercel.json --
// 4 separate daily entries covering both possible UTC hours for 10am/8pm
// Eastern across the DST boundary). This check picks out the 2 of those 4
// that actually match the current season, so the schedule stays correct
// year-round without needing Pro or an external scheduler.
function currentEasternHour(): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  return parseInt(formatted, 10) % 24;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const hour = currentEasternHour();
  if (hour !== 10 && hour !== 20) {
    return NextResponse.json({ skipped: true, reason: 'Not a reminder hour.', hour });
  }

  // Same definition as the Inbox unread badge: not yet acknowledged,
  // and not filed into a category (filing counts as "dealt with").
  const rows = await sql`
    SELECT p.id, p.name, p.email, COUNT(ar.id) AS unacked_count,
           array_agg(a.title ORDER BY a.created_at) AS titles
    FROM people p
    JOIN announcement_recipients ar ON ar.recipient_id = p.id AND ar.acknowledged_at IS NULL
    JOIN announcements a ON a.id = ar.announcement_id
    WHERE NOT EXISTS (
      SELECT 1 FROM announcement_filings f
      WHERE f.person_id = p.id AND f.announcement_id = a.id
    )
    AND p.email IS NOT NULL
    GROUP BY p.id, p.name, p.email
    HAVING COUNT(ar.id) > 0
  `;

  // Fire concurrently, not one at a time -- with up to ~150 people this
  // has to fit inside Hobby's 10-second function limit, so a serial loop
  // with delays between calls isn't an option here.
  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const slackUserId = await lookupSlackUserByEmail(row.email);
      if (!slackUserId) {
        return { name: row.name, outcome: 'no_slack_match' as const };
      }

      const titleList = row.titles.slice(0, 5).map((t: string) => `• ${t}`).join('\n');
      const extra = row.titles.length > 5 ? `\n…and ${row.titles.length - 5} more` : '';
      const text =
        `👋 You have ${row.unacked_count} unacknowledged announcement${row.unacked_count === 1 ? '' : 's'} on Relay Board:\n` +
        `${titleList}${extra}\n\n` +
        `Open Relay Board: ${APP_URL}`;

      const ok = await sendSlackDM(slackUserId, text);
      return { name: row.name, outcome: ok ? ('sent' as const) : ('send_failed' as const) };
    })
  );

  let sent = 0;
  let noSlackMatch = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
      continue;
    }
    if (result.value.outcome === 'sent') sent++;
    else if (result.value.outcome === 'no_slack_match') noSlackMatch++;
    else errors.push(`${result.value.name}: send failed`);
  }

  return NextResponse.json({
    hour,
    peopleWithUnacked: rows.length,
    sent,
    noSlackMatch,
    errors,
  });
}
