import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllDrafts,
  clearDraft,
  readDraft,
  readDraftPhoto,
  saveDraftPhoto,
  writeDraft,
  type ContributeDraft,
} from './drafts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const draft: ContributeDraft = {
  values: { name: 'Rooftop Sessions', city: 'Lagos', link: 'https://x.co' },
  picked: { city: 'Lagos' },
  days: 14,
  agreed: true,
  photoId: 'p1',
  hosted: { source: 'p1', url: 'https://cdn.test/p1.jpg' },
};

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('contribute drafts', () => {
  it('keeps every field, the run, the agreement and the photo marker', () => {
    writeDraft('ad', draft);
    expect(readDraft('ad')).toEqual(draft);
  });

  it('keeps one draft per form', () => {
    writeDraft('event', draft);
    writeDraft('promo', { ...draft, values: { name: 'Deal' } });
    expect(readDraft('event')?.values.name).toBe('Rooftop Sessions');
    expect(readDraft('promo')?.values.name).toBe('Deal');
    clearDraft('event');
    expect(readDraft('event')).toBeNull();
    expect(readDraft('promo')).not.toBeNull();
  });

  it('does not keep an empty form', () => {
    writeDraft('event', draft);
    writeDraft('event', {
      values: { name: '  ' },
      picked: {},
      days: 7,
      agreed: false,
    });
    expect(readDraft('event')).toBeNull();
  });

  it('forgets every draft at once', () => {
    writeDraft('event', draft);
    writeDraft('ad', draft);
    clearAllDrafts();
    expect(storage.data.size).toBe(0);
  });

  it('ignores a damaged draft', () => {
    storage.setItem('membrs.draft.event', '"nope"');
    expect(readDraft('event')).toBeNull();
  });

  it('degrades without IndexedDB instead of throwing', async () => {
    expect(await saveDraftPhoto('event', new Blob(['x']))).toBe(false);
    expect(await readDraftPhoto('event')).toBeNull();
  });
});
