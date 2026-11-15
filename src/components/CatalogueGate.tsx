import type { ReactNode } from 'react';
import { catalogueStore, loadCatalogue } from '../lib/api';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';

export function CatalogueGate({ children }: { children: ReactNode }) {
  const { status } = useStore(catalogueStore);
  if (status === 'ready') return children;
  const retrying = status === 'loading';
  return (
    <div className="page grid min-h-[50vh] place-items-center text-center">
      <div role="alert">
        <h1 className="text-4xl font-semibold tracking-tight">
          {titleCase(
            retrying ? 'Loading listings' : 'We could not load listings',
          )}
        </h1>
        <button
          type="button"
          disabled={retrying}
          onClick={() => void loadCatalogue()}
          className="bg-fg text-bg mt-6 inline-flex h-11 items-center rounded-md px-5 font-bold disabled:opacity-60"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
