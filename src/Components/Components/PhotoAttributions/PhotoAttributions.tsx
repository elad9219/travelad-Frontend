import React from 'react';
import './PhotoAttributions.css';

function text(value: string): string {
  // Remove markup before decoding entities. Escaped tags remain plain React text.
  const plain = value.replace(/<[^>]*>/g, '');
  const escaped = plain.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return new DOMParser()
    .parseFromString(escaped, 'text/html')
    .body.textContent || '';
}

function safeLink(value: string): string | undefined {
  try {
    const url = new URL(text(value));

    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
}

function credit(value: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const anchors = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;

  let end = 0;
  let match: RegExpExecArray | null;

  while ((match = anchors.exec(value)) !== null) {
    parts.push(text(value.slice(end, match.index)));

    const name = text(match[3]);
    const href = safeLink(match[2]);

    parts.push(
      href ? (
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {name}
        </a>
      ) : name
    );

    end = anchors.lastIndex;
  }

  parts.push(text(value.slice(end)));
  return parts;
}

const PhotoAttributions: React.FC<{ values?: unknown }> = ({ values }) => {
  const entries = Array.isArray(values)
    ? values.filter((value): value is string =>
        typeof value === 'string' &&
        value.length <= 8192 &&
        Boolean(text(value).trim())
      )
    : [];

  if (!entries.length) {
    return null;
  }

  return (
    <div
      className="place-photo-credits"
      role="note"
      aria-label="Photo credits"
    >
      <span>Photo:</span>

      {entries.map((value, index) => (
        <div key={index}>{credit(value)}</div>
      ))}
    </div>
  );
};

export default PhotoAttributions;