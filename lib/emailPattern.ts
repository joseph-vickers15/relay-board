// Computes the default company email from a person's name, following
// the first.last@playonsports.com pattern. Admins can override this
// per-person if someone's real email doesn't follow the pattern.
export function defaultEmailForName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] || '';
  const last = parts.slice(1).join('');
  return `${first.toLowerCase()}.${last.toLowerCase()}@playonsports.com`;
}
