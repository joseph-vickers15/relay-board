// Supports a simple markdown image syntax: ![alt text](https://url)
// Anything matching that pattern renders as an actual inline <img>;
// everything else renders as plain text, preserving line breaks.
export function renderBody(body: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key++}
        src={match[2]}
        alt={match[1] || 'Attached image'}
        className="my-2 max-h-96 max-w-full rounded-lg border border-white/10"
      />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(<span key={key++}>{body.slice(lastIndex)}</span>);
  }

  return parts;
}
