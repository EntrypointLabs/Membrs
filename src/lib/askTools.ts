import type { AssistantMessage } from './assistant';
import { createStore } from './store';
import chatgptLogo from '../assets/ai/chatgpt.png';
import claudeLogo from '../assets/ai/claude.svg';
import geminiLogo from '../assets/ai/gemini.png';
import grokLogo from '../assets/ai/grok.svg';
import perplexityLogo from '../assets/ai/perplexity.svg';

export type OutsideTool =
  'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity';

export type AskTool = 'membrs' | OutsideTool;

export interface AskToolOption {
  id: AskTool;
  name: string;
  logo: string;
}

export const OUTSIDE_TOOLS: (AskToolOption & { id: OutsideTool })[] = [
  { id: 'claude', name: 'Claude', logo: claudeLogo },
  { id: 'chatgpt', name: 'ChatGPT', logo: chatgptLogo },
  { id: 'gemini', name: 'Gemini', logo: geminiLogo },
  { id: 'grok', name: 'Grok', logo: grokLogo },
  { id: 'perplexity', name: 'Perplexity', logo: perplexityLogo },
];

export const MEMBRS_LOGO = '/favicon.svg';

export const ASK_TOOLS: AskToolOption[] = [
  { id: 'membrs', name: 'membrs', logo: MEMBRS_LOGO },
  ...OUTSIDE_TOOLS,
];

const OUTSIDE_LINK: Record<OutsideTool, (prompt: string) => string> = {
  claude: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  chatgpt: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  gemini: () => 'https://gemini.google.com/app',
  grok: (prompt) => `https://grok.com/?q=${encodeURIComponent(prompt)}`,
  perplexity: (prompt) =>
    `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`,
};

export function outsideLink(tool: OutsideTool, prompt: string): string {
  return OUTSIDE_LINK[tool](prompt);
}

export function takesPromptInLink(tool: OutsideTool): boolean {
  return tool !== 'gemini';
}

export interface AskWith {
  tool: AskTool;
  outside: OutsideTool;
}

export const askWithStore = createStore<AskWith>('membrs.askWith', {
  tool: 'membrs',
  outside: 'claude',
});

export function pickTool(tool: AskTool): void {
  askWithStore.set((prev) => ({
    tool,
    outside: tool === 'membrs' ? prev.outside : tool,
  }));
}

export function switchToOutside(): void {
  askWithStore.set((prev) => ({ ...prev, tool: prev.outside }));
}

export const CHAT_CHARACTER_BUDGET = 4000;

function transcript(messages: AssistantMessage[]): string {
  const lines: string[] = [];
  let used = 0;
  for (const message of [...messages].reverse()) {
    const line = `${message.role === 'user' ? 'Me' : 'membrs'}: ${message.content.trim()}`;
    if (used + line.length > CHAT_CHARACTER_BUDGET) break;
    lines.unshift(line);
    used += line.length;
  }
  return lines.join('\n\n');
}

export function outsidePrompt({
  question,
  pageUrl,
  chat,
}: {
  question: string;
  pageUrl: string;
  chat: AssistantMessage[];
}): string {
  const parts = [question.trim(), `Page: ${pageUrl}`];
  const earlier = transcript(chat);
  if (earlier) parts.push(`My chat on membrs so far:\n\n${earlier}`);
  return parts.join('\n\n');
}

export function openOutside(
  tool: OutsideTool,
  question: string,
  chat: AssistantMessage[] = [],
): void {
  const prompt = outsidePrompt({
    question,
    pageUrl: window.location.href,
    chat,
  });
  if (!takesPromptInLink(tool))
    void navigator.clipboard?.writeText(prompt).catch(() => undefined);
  window.open(outsideLink(tool, prompt), '_blank', 'noopener,noreferrer');
}

export function listingQuestion(
  kind: 'event' | 'opportunity',
  title: string,
): string {
  return kind === 'event'
    ? `Tell me about "${title}": what it is, who it suits, and whether it is worth going.`
    : `Explain "${title}": who is eligible, what it offers, and how to apply well.`;
}

export type QuickKind = 'event' | 'opportunity';

export interface QuickQuestion {
  label: string;
  ask: string;
  kind?: QuickKind;
}

export type QuickContext =
  | { on: 'event'; title: string }
  | { on: 'opportunity'; title: string }
  | { on: 'category'; name: string; kind: 'event' | 'opportunity' | 'place' }
  | { on: 'feed'; feed: 'events' | 'opportunities' | 'places' | 'promos' }
  | { on: 'anywhere' };

function same(text: string, kind?: QuickKind): QuickQuestion {
  return kind ? { label: text, ask: text, kind } : { label: text, ask: text };
}

export function quickQuestions(
  context: QuickContext,
  city: string,
): QuickQuestion[] {
  switch (context.on) {
    case 'event':
      return [
        {
          label: 'What should I know before going?',
          ask: `What should I know before going to "${context.title}"?`,
          kind: 'event',
        },
        {
          label: 'Find similar events',
          ask: `Find events like "${context.title}" in ${city}`,
          kind: 'event',
        },
      ];
    case 'opportunity':
      return [
        {
          label: 'Am I eligible?',
          ask: `Who is eligible for "${context.title}"?`,
          kind: 'opportunity',
        },
        {
          label: 'What do I need to apply?',
          ask: `What do I need to apply for "${context.title}"?`,
          kind: 'opportunity',
        },
      ];
    case 'category':
      if (context.kind === 'event')
        return [
          same(`${context.name} events in ${city} this week`, 'event'),
          same(`Free ${context.name} events in ${city}`, 'event'),
        ];
      if (context.kind === 'opportunity')
        return [
          same(`${context.name} closing this month`, 'opportunity'),
          same(`Fully funded ${context.name}`, 'opportunity'),
        ];
      return [
        same(`${context.name} to visit in ${city}`),
        same(`Best ${context.name} in ${city} this weekend`),
      ];
    case 'feed':
      if (context.feed === 'opportunities')
        return [
          same('Which opportunities close this week?', 'opportunity'),
          same('Fully funded scholarships closing this month', 'opportunity'),
        ];
      if (context.feed === 'places')
        return [
          same(`Places to visit in ${city} this weekend`),
          same(`Where to eat in ${city}`),
        ];
      if (context.feed === 'promos')
        return [
          same(`Deals in ${city} this week`),
          same(`Happy hours in ${city}`),
        ];
      return [
        same(`What's on in ${city} this weekend?`, 'event'),
        same(`Free events in ${city} this week`, 'event'),
      ];
    case 'anywhere':
      return [
        same(`What's on in ${city} this weekend?`, 'event'),
        same('Which opportunities close this week?', 'opportunity'),
        same(`Free events in ${city} this week`, 'event'),
        same('Fully funded scholarships closing this month', 'opportunity'),
        same(`What's on in ${city} tonight?`, 'event'),
      ];
  }
}
