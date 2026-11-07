import { Link } from '../components/Link';

export function NotFoundScreen() {
  return (
    <div className="page grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="text-fg-3 text-sm font-semibold tracking-wide uppercase">
          404
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          That page moved or never existed.
        </h1>
        <Link
          href="/"
          className="bg-fg text-bg mt-6 inline-flex h-11 items-center rounded-md px-5 font-bold"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
