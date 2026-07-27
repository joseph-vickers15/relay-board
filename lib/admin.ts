import { sql } from './db';

// Returns true if `targetId` is `actorId` themselves, or anyone below
// `actorId` in the org chart (recursively). This is the one rule that
// decides everything a leader is allowed to touch on the Admin page.
export async function isWithinAuthority(actorId: string, targetId: string): Promise<boolean> {
  const [row] = await sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM people WHERE id = ${actorId}
      UNION ALL
      SELECT p.id FROM people p JOIN tree t ON p.manager_id = t.id
    )
    SELECT EXISTS(SELECT 1 FROM tree WHERE id = ${targetId}) AS value
  `;
  return row.value === true;
}

export async function isPeopleLeader(personId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT EXISTS(SELECT 1 FROM people WHERE manager_id = ${personId}) AS value
  `;
  return row.value === true;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
