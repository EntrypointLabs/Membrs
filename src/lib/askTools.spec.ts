import { describe, expect, it } from 'vitest';
import type { AssistantMessage } from './assistant';
import {
  CHAT_CHARACTER_BUDGET,
  listingQuestion,
  OUTSIDE_TOOLS,
  outsideLink,
  outsidePrompt,
  quickQuestions,
} from './askTools';

function message(
  role: 'user' | 'assistant',
  content: string,
): AssistantMessage {
  return { id: content, role, content, listingIds: [], createdAt: '' };
}

describe('outsidePrompt', () => {
  it('sends the question and the page on their own', () => {
    expect(
      outsidePrompt({
        question: ' Am I eligible? ',
        pageUrl: 'https://membrs.app/listing/1',
        chat: [],
      }),
    ).toBe('Am I eligible?\n\nPage: https://membrs.app/listing/1');
  });

  it('carries the membrs chat along', () => {
    const prompt = outsidePrompt({
      question: 'And the deadline?',
      pageUrl: 'https://membrs.app/',
      chat: [
        message('user', 'Grants in Lagos'),
        message('assistant', 'Here are two.'),
      ],
    });
    expect(prompt).toContain('Me: Grants in Lagos\n\nmembrs: Here are two.');
  });

  it('keeps the latest messages when the chat is long', () => {
    const old = message('user', 'x'.repeat(CHAT_CHARACTER_BUDGET));
    const prompt = outsidePrompt({
      question: 'Q',
      pageUrl: 'p',
      chat: [old, message('assistant', 'newest')],
    });
    expect(prompt).toContain('membrs: newest');
    expect(prompt).not.toContain('xxxx');
  });
});

describe('outsideLink', () => {
  it('puts the prompt in the link for tools that take one', () => {
    expect(outsideLink('claude', 'a b')).toBe('https://claude.ai/new?q=a%20b');
    expect(outsideLink('chatgpt', 'a&b')).toBe('https://chatgpt.com/?q=a%26b');
    expect(outsideLink('gemini', 'a')).toBe('https://gemini.google.com/app');
  });
});

describe('quickQuestions', () => {
  it('asks about the listing on a listing page', () => {
    const [eligible, apply] = quickQuestions(
      { on: 'opportunity', title: 'Chevening' },
      'Lagos',
    );
    expect(eligible).toEqual({
      label: 'Am I eligible?',
      ask: 'Who is eligible for "Chevening"?',
    });
    expect(apply.ask).toContain('"Chevening"');
  });

  it('uses the city everywhere else', () => {
    expect(quickQuestions({ on: 'anywhere' }, 'Accra')[0].ask).toBe(
      "What's on in Accra this weekend?",
    );
  });
});

describe('asking an outside assistant about a listing', () => {
  it('offers the five big assistants, each with a logo', () => {
    expect(OUTSIDE_TOOLS.map((tool) => tool.name)).toEqual([
      'Claude',
      'ChatGPT',
      'Gemini',
      'Grok',
      'Perplexity',
    ]);
    expect(new Set(OUTSIDE_TOOLS.map((tool) => tool.logo)).size).toBe(
      OUTSIDE_TOOLS.length,
    );
  });

  it('carries the question in the Grok link', () => {
    expect(
      outsideLink('grok', listingQuestion('opportunity', 'Chevening')),
    ).toContain('grok.com/?q=Explain%20%22Chevening%22');
  });
});
