import { sql } from './db';

// Returns true if `targetId` is `actorId` themselves, or anyone below
// `actorId` in the org chart (recursively) AND in the same department --
// this is the one rule that decides everything a leader is allowed to
// touch on the Admin page. Department is a hard boundary here on purpose:
// the org chart can technically link across departments (everyone reports
// up to the SVP eventually), but boards -- including admin authority --
// must stay isolated per department. The one exception is a super admin,
// who bypasses both the tree check and the department boundary entirely.
export async function isWithinAuthority(actorId: string, targetId: string): Promise<boolean> {
  const [actor] = await sql`
    SELECT department_id, is_super_admin FROM people WHERE id = ${actorId}
  `;
  if (!actor) return false;
  if (actor.is_super_admin) return true;

  const [row] = await sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM people WHERE id = ${actorId}
      UNION ALL
      SELECT p.id FROM people p JOIN tree t ON p.manager_id = t.id
    )
    SELECT EXISTS(
      SELECT 1 FROM tree t
      JOIN people p ON p.id = t.id
      WHERE t.id = ${targetId} AND p.department_id = ${actor.department_id}
    ) AS value
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

