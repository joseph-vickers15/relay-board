export const TAG_COLORS: Record<string, string> = {
  Console: '#22C55E',
  Process: '#A855F7',
  'Policy/HR': '#F97316',
  SOP: '#EAB308',
  Salesforce: '#3B82F6',
  Training: '#2DD4BF',
  'Action Required': '#EF4444',
};

export const DEFAULT_TAG_COLOR = '#94A3B8';

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLOR;
}
