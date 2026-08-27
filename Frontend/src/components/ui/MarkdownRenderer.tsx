import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type Token =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'source'; text: string }
  | { kind: 'p'; text: string };

/** Very small Markdown tokenizer — no dependencies required. */
function tokenize(md: string): Token[] {
  const lines = md.split('\n');
  const tokens: Token[] = [];
  let listItems: string[] | null = null;
  let listKind: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems && listKind) {
      tokens.push({ kind: listKind, items: listItems });
    }
    listItems = null;
    listKind = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      tokens.push({ kind: 'h3', text: line.slice(4) });
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList();
      tokens.push({ kind: 'h2', text: line.replace(/^#+\s/, '') });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      if (listKind !== 'ul') { flushList(); listItems = []; listKind = 'ul'; }
      listItems!.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (listKind !== 'ol') { flushList(); listItems = []; listKind = 'ol'; }
      listItems!.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    if (/^\[Source:/i.test(line)) {
      flushList();
      tokens.push({ kind: 'source', text: line });
      continue;
    }

    // **Standalone bold line** treated as a sub-heading
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      flushList();
      tokens.push({ kind: 'h3', text: line.replace(/\*\*/g, '') });
      continue;
    }

    flushList();
    tokens.push({ kind: 'p', text: line });
  }

  flushList();
  return tokens;
}

/** Render inline **bold** and *italic* */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const raw = match[0];
    if (raw.startsWith('**')) {
      parts.push(<strong key={match.index} className="font-semibold text-stone-800">{raw.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={match.index} className="italic">{raw.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;
  const tokens = tokenize(content);

  return (
    <div className={`space-y-3 text-[14px] leading-relaxed text-stone-700 ${className}`}>
      {tokens.map((token, i) => {
        switch (token.kind) {
          case 'h2':
            return (
              <p key={i} className="text-[12px] font-bold text-stone-500 uppercase tracking-widest pt-2">
                {renderInline(token.text)}
              </p>
            );
          case 'h3':
            return (
              <p key={i} className="text-[13px] font-semibold text-stone-800 leading-snug">
                {renderInline(token.text)}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {token.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span className="leading-relaxed">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="space-y-1.5 pl-1">
                {token.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-teal-600 font-bold text-[12px] w-4 pt-px">{j + 1}.</span>
                    <span className="leading-relaxed">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          case 'source':
            return (
              <p key={i} className="text-[11px] font-medium text-stone-400 italic border-t border-stone-100 pt-2 mt-1">
                {token.text}
              </p>
            );
          default:
            return (
              <p key={i} className="leading-relaxed">
                {renderInline(token.text)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;
