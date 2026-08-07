const SLACK_API = 'https://slack.com/api';

function getToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not set.');
  }
  return token;
}

export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  const res = await fetch(`${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!data.ok) {
    return null; // most commonly users_not_found -- just skip that person
  }
  return data.user.id as string;
}

export async function sendSlackDM(slackUserId: string, text: string): Promise<boolean> {
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: slackUserId, text }),
  });
  const data = await res.json();
  return data.ok === true;
}
