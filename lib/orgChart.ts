// This file is the ONE place that defines who's in the org and who they
// report to. Everything else (login list, cascades, escalations) reads
// from this. Later this moves into the database so it's editable from the
// Admin page, but for Step 1 it lives here as plain data so we can see it
// and get the shape right first.

export type Role = 'SVP' | 'Director' | 'Senior Manager' | 'Manager' | 'Tier 3' | 'Senior IC' | 'IC';

export interface Person {
  id: string; // stable slug, e.g. "casey-silcox"
  name: string;
  role: Role;
  managerId: string | null; // id of the person this person reports to
}

function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helper so we don't have to hand-type ids and can just write names below.
function p(name: string, role: Role, managerName: string | null): Person {
  return {
    id: slug(name),
    name,
    role,
    managerId: managerName ? slug(managerName) : null,
  };
}

export const people: Person[] = [
  p('Casey Silcox', 'SVP', null),
  p('Joseph Vickers', 'Director', 'Casey Silcox'),

  // --- Senior Manager: Dohnny Iszard ---
  p('Dohnny Iszard', 'Senior Manager', 'Joseph Vickers'),
  p('Alfred Taliaferro', 'IC', 'Dohnny Iszard'),
  p('Antionette Brown', 'IC', 'Dohnny Iszard'),
  p('Evan Nutsugah', 'IC', 'Dohnny Iszard'),
  p('Haran Griffin', 'IC', 'Dohnny Iszard'),
  p('Ireal James', 'IC', 'Dohnny Iszard'),
  p('Juliana Yagyu', 'IC', 'Dohnny Iszard'),
  p('Katie Manis', 'IC', 'Dohnny Iszard'),
  p('Kenneth House', 'IC', 'Dohnny Iszard'),
  p('Kirah Martin', 'IC', 'Dohnny Iszard'),
  p('Lydia Mercado', 'IC', 'Dohnny Iszard'),
  p('Mason Roach', 'IC', 'Dohnny Iszard'),
  p('Nauman Khan', 'IC', 'Dohnny Iszard'),
  p('Nick Broadie', 'IC', 'Dohnny Iszard'),
  p('Rachel Williamson', 'IC', 'Dohnny Iszard'),

  // --- Manager: Sam Williamson ---
  p('Sam Williamson', 'Manager', 'Joseph Vickers'),
  p('Luke Stapleton', 'IC', 'Sam Williamson'),
  p('Ebony Kelsey', 'IC', 'Sam Williamson'),
  p('James Powell', 'IC', 'Sam Williamson'),
  p('Jeremy Turner', 'IC', 'Sam Williamson'),
  p('Johnny Huynh', 'IC', 'Sam Williamson'),
  p('Kyle Snider', 'IC', 'Sam Williamson'),
  p('Mattie McMillan-Benton', 'IC', 'Sam Williamson'),
  p('Michael Rakestraw', 'IC', 'Sam Williamson'),
  p('Ryan Gant', 'IC', 'Sam Williamson'),
  p('Shawn Farley', 'IC', 'Sam Williamson'),
  p('Sommer Hope', 'IC', 'Sam Williamson'),
  p('Sunshine Patterson', 'IC', 'Sam Williamson'),
  p('Tyler Todd', 'IC', 'Sam Williamson'),

  // --- Manager: Erik Millan ---
  p('Erik Millan', 'Manager', 'Joseph Vickers'),
  p('Adam Nye', 'IC', 'Erik Millan'),
  p('Alyssa Tankersley', 'IC', 'Erik Millan'),
  p('Ashtyn Bailey', 'IC', 'Erik Millan'),
  p('Camaron King', 'IC', 'Erik Millan'),
  p('Elvis Vu', 'IC', 'Erik Millan'),
  p('Jarrett Todd', 'IC', 'Erik Millan'),
  p('Jason Bremermann', 'IC', 'Erik Millan'),
  p('Kahlil Lambert', 'IC', 'Erik Millan'),
  p('Mark Brand', 'IC', 'Erik Millan'),
  p('Morticia Hollis', 'IC', 'Erik Millan'),

  // --- Manager: Rachel Wolovick ---
  p('Rachel Wolovick', 'Manager', 'Joseph Vickers'),
  p('Amie Brannon', 'IC', 'Rachel Wolovick'),
  p('Autura Carson', 'IC', 'Rachel Wolovick'),
  p('Cameron Fisk', 'IC', 'Rachel Wolovick'),
  p('Charles McGinty', 'IC', 'Rachel Wolovick'),
  p('Corey Watson', 'IC', 'Rachel Wolovick'),
  p('Kacy Coulombe', 'IC', 'Rachel Wolovick'),
  p('Kesa Pringle', 'IC', 'Rachel Wolovick'),
  p('Lilith Sharp', 'IC', 'Rachel Wolovick'),
  p('Nicholas Brawner', 'IC', 'Rachel Wolovick'),

  // --- Tier 3 (report directly to Director) ---
  p('Jesse Carlson', 'Tier 3', 'Joseph Vickers'),
  p('Ian Moore', 'Tier 3', 'Joseph Vickers'),
  p('Eric Huisman', 'Tier 3', 'Joseph Vickers'),
];

// --- Small helpers we'll reuse everywhere (login list, cascades, admin) ---

export function getPersonById(id: string): Person | undefined {
  return people.find((person) => person.id === id);
}

export function getDirectReports(managerId: string): Person[] {
  return people.filter((person) => person.managerId === managerId);
}

// Walks up the chain: IC -> Manager -> Director -> SVP
export function getManagerChain(personId: string): Person[] {
  const chain: Person[] = [];
  let current = getPersonById(personId);
  while (current?.managerId) {
    const manager = getPersonById(current.managerId);
    if (!manager) break;
    chain.push(manager);
    current = manager;
  }
  return chain;
}

// True for anyone who has at least one direct report (used to gate
// the Admin page and the "send announcement" screen).
export function isPeopleLeader(personId: string): boolean {
  return people.some((person) => person.managerId === personId);
}

export const sortedForDropdown = [...people].sort((a, b) => a.name.localeCompare(b.name));
