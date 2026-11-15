import { readStored, removeStored, writeStored } from './storage';
import type { ContributeKind } from './types';

export interface HostedPhoto {
  source: string;
  url: string;
}

export interface ContributeDraft {
  values: Record<string, string>;
  picked: Record<string, string>;
  days: number | null;
  agreed: boolean;
  photoId?: string;
  hosted?: HostedPhoto;
  resume?: boolean;
}

const KINDS: ContributeKind[] = [
  'event',
  'opportunity',
  'place',
  'promo',
  'ad',
];

const DB_NAME = 'membrs';
const DB_STORE = 'draftPhotos';

function draftKey(kind: ContributeKind): string {
  return `membrs.draft.${kind}`;
}

export function readDraft(kind: ContributeKind): ContributeDraft | null {
  const draft = readStored<ContributeDraft | null>(draftKey(kind), null);
  if (!draft || typeof draft !== 'object' || !draft.values) return null;
  return {
    values: draft.values,
    picked: draft.picked ?? {},
    days: draft.days ?? null,
    agreed: Boolean(draft.agreed),
    ...(draft.photoId ? { photoId: draft.photoId } : {}),
    ...(draft.hosted ? { hosted: draft.hosted } : {}),
    ...(draft.resume ? { resume: true } : {}),
  };
}

export function hasContent(draft: ContributeDraft): boolean {
  return (
    Object.values(draft.values).some((v) => v.trim() !== '') ||
    Boolean(draft.photoId) ||
    draft.agreed
  );
}

export function writeDraft(kind: ContributeKind, draft: ContributeDraft): void {
  if (hasContent(draft)) writeStored(draftKey(kind), draft);
  else removeStored(draftKey(kind));
}

export function clearDraft(kind: ContributeKind): void {
  removeStored(draftKey(kind));
  void deleteDraftPhoto(kind);
}

export function clearAllDrafts(): void {
  KINDS.forEach(clearDraft);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE))
          request.result.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withPhotos<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
  fallback: T,
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback;
  return new Promise<T>((resolve) => {
    try {
      const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
      request.onsuccess = () => resolve((request.result as T) ?? fallback);
      request.onerror = () => resolve(fallback);
    } catch {
      resolve(fallback);
    }
  }).finally(() => db.close());
}

export function saveDraftPhoto(
  kind: ContributeKind,
  blob: Blob,
): Promise<boolean> {
  return withPhotos(
    'readwrite',
    (store) => store.put(blob, kind),
    false as boolean,
  ).then((result) => result !== false);
}

export function readDraftPhoto(kind: ContributeKind): Promise<Blob | null> {
  return withPhotos<Blob | null>('readonly', (store) => store.get(kind), null);
}

export function deleteDraftPhoto(kind: ContributeKind): Promise<void> {
  return withPhotos('readwrite', (store) => store.delete(kind), null).then(
    () => undefined,
  );
}
