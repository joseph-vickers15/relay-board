'use client';

import { useState } from 'react';

// Supports a simple markdown image syntax: ![alt text](https://url)
// Anything matching that pattern renders as a clickable inline <img>
// that opens a fullscreen lightbox when clicked; everything else
// renders as plain text, preserving line breaks.
export function BodyContent({ body }: { body: string }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const regex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }
    const url = match[2];
    const alt = match[1] || 'Attached image';
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
