import type { ReactNode } from 'react';
import { paths } from '../lib/router';
import { Link } from '../components/Link';

export function NotFoundScreen({
  title = 'That page moved or never existed.',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page grid min-h-[50vh] place-items-center text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={paths.home()}
            className="bg-fg text-bg inline-flex h-11 items-center rounded-md px-5 font-bold"
          >
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
