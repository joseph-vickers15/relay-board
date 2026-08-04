'use client';

import { useState } from 'react';

// Handles three things in the raw text, in priority order:
// 1. ![alt](url)  -> inline image, click to enlarge
// 2. [text](url)  -> a clickable link with custom text
// 3. any bare http(s):// URL -> auto-linked as-is
const PATTERN =
  /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)/g;

// Raw URLs often get trailing punctuation swept in ("check this out:
// https://example.com."). This peels off trailing punctuation so it
// renders as plain text after the link instead of being part of the URL.
function splitTrailingPunctuation(url: string): { url: string; trailing: string } {
  const match = url.match(/^(.*[^.,;:!?)\]}'"])([.,;:!?)\]}'"]*)$/);
  if (!match) return { url, trailing: '' };
  return { url: match[1], trailing: match[2] };
}

export function BodyContent({ body }: { body: string }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const regex = new RegExp(PATTERN);

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }

    if (match[2] !== undefined) {
      // ![alt](url) -- inline image
      const alt = match[1] || 'Attached image';
      const url = match[2];
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key++}
          src={url}
          alt={alt}
          onClick={() => setExpandedUrl(url)}
          className="my-2 max-h-96 max-w-full cursor-zoom-in rounded-lg border border-white/10 transition hover:opacity-90"
        />
      );
    } else if (match[4] !== undefined) {
      // [text](url) -- custom-text link
      const text = match[3] || match[4];
      parts.push(
        <a
          key={key++}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-playon-teal underline hover:text-white"
        >
          {text}
        </a>
      );
    } else if (match[5] !== undefined) {
      // bare URL -- auto-linked
      const { url, trailing } = splitTrailingPunctuation(match[5]);
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-playon-teal underline hover:text-white"
        >
          {url}
        </a>
      );
      if (trailing) parts.push(<span key={key++}>{trailing}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(<span key={key++}>{body.slice(lastIndex)}</span>);
  }

  return (
    <>
      {parts}

      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setExpandedUrl(null)}
        >
          <button
            onClick={() => setExpandedUrl(null)}
            className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            ✕ Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedUrl}
            alt="Expanded"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
