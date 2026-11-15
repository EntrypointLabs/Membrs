export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string };

export type Block =
  | { kind: 'paragraph'; lines: Inline[][] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] };

const INLINE =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

export function safeHref(href: string): string | null {
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//') && !href.includes('\\'))
    return href;
  return null;
}

export function inlines(text: string): Inline[] {
  const out: Inline[] = [];
  const push = (node: Inline) => {
    const last = out.at(-1);
    if (node.kind === 'text' && last?.kind === 'text') last.text += node.text;
    else if (node.text) out.push(node);
  };
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    push({ kind: 'text', text: text.slice(last, index) });
    if (match[1] !== undefined) {
      push({ kind: 'bold', text: match[1] });
    } else {
      const label = match[2] ?? match[4] ?? '';
      const href = safeHref(match[3] ?? match[4] ?? '');
      push(
        href
          ? { kind: 'link', text: label, href }
          : { kind: 'text', text: label },
      );
    }
    last = index + match[0].length;
  }
  push({ kind: 'text', text: text.slice(last) });
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function blocks(text: string): Block[] {
  const out: Block[] = [];
  let current: Block | null = null;
  const close = () => {
    if (current) out.push(current);
    current = null;
  };
  for (const line of text.split(/\r?\n/)) {
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const ordered = Boolean(numbered);
      if (current?.kind !== 'list' || current.ordered !== ordered) {
        close();
        current = { kind: 'list', ordered, items: [] };
      }
      current.items.push(inlines(item[1] ?? ''));
      continue;
    }
    if (!line.trim()) {
      close();
      continue;
    }
    const heading = HEADING.exec(line);
    const content: Inline[] = heading
      ? [{ kind: 'bold', text: (heading[1] ?? '').replace(/\*\*/g, '') }]
      : inlines(line);
    if (current?.kind !== 'paragraph') {
      close();
      current = { kind: 'paragraph', lines: [] };
    }
    current.lines.push(content);
  }
  close();
  return out;
}
