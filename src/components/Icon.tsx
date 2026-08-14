import type { ReactNode } from 'react';

const icons: Record<string, ReactNode> = {
  play: '▶',
  pause: 'Ⅱ',
  previous: '‹',
  next: '›',
  share: '↗',
  layers: '▱',
  info: 'i',
  close: '×',
  reset: '⌂',
  location: '◎',
  chevron: '⌃',
  download: '↓',
  calendar: '▣',
};

export function Icon({ name }: { name: keyof typeof icons }) {
  return <span className={`icon icon-${name}`} aria-hidden="true">{icons[name]}</span>;
}

