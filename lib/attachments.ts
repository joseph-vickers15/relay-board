// Vercel's server-side upload path is capped at 4.5MB per request by the
// platform itself, so we stay comfortably under that.
export const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024; // 4MB
export const MAX_ATTACHMENT_SIZE_LABEL = '4MB';
