import { digestById, digestIssues, listingById } from '../lib/api';
import { paths } from '../lib/router';
import { titleCase } from '../lib/text';
import { openOverlay } from '../lib/ui';
import type { Listing } from '../lib/types';
import { DigestCard } from '../components/DigestCard';
import { Kicker } from '../components/Kicker';
import { Link } from '../components/Link';
import { priceOf } from '../components/ListingCard';
import { Photo } from '../components/Photo';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import { whenLine } from '../lib/dates';
import { Crumbs } from './DetailParts';
import { NotFoundScreen } from './NotFoundScreen';

/** Every digest issue, newest first, with the signup up top. */
export function DigestScreen() {
  const issues = digestIssues();
  return (
    <div className="page pt-8 md:pt-16">
      <header className="border-line mb-14 flex flex-wrap items-end justify-between gap-8 border-b pb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            The Sunday Digest
          </h1>
          <p className="text-fg-2 mt-4 max-w-xl text-lg">
            One email every Sunday at 7 AM: the week&apos;s best events, the
            deadlines worth knowing and where to go, for your city.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openOverlay('digest')}
          className="bg-brand hover:bg-brand-hover h-12 rounded-md px-6 font-bold text-white"
        >
          Get the digest
        </button>
      </header>
      <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 md:grid-cols-3">
        {issues.map((d) => (
          <DigestCard key={d.id} issue={d} />
        ))}
      </div>
    </div>
  );
}

/** One issue: the intro, then each pick as a numbered entry. */
export function IssueScreen({ id }: { id: string }) {
  const issue = digestById(id);
  if (!issue) return <NotFoundScreen />;
  const picks = issue.listingIds
    .map(listingById)
    .filter((l): l is Listing => Boolean(l));
  const others = digestIssues()
    .filter((d) => d.id !== issue.id)
    .slice(0, 3);
  return (
    <div className="page pt-6 md:pt-10">
      <Crumbs trail={[['Digest', paths.digest()]]} />
      <article className="mx-auto mt-10 max-w-3xl">
        <p className="text-fg-3 text-[15px]">
          <b className="text-fg">{issue.type}</b> · {issue.city} · No.{' '}
          {issue.number} · {issue.date} · {issue.readMinutes} min read
        </p>
        <h1 className="mt-3 text-[clamp(34px,4vw,60px)] leading-[1.05] font-semibold tracking-tight">
          {titleCase(issue.title)}
        </h1>
        <p className="text-fg-2 mt-4 text-xl">{issue.dek}</p>
        {issue.intro.map((p) => (
          <p key={p} className="text-fg-2 mt-6 text-lg leading-relaxed">
            {p}
          </p>
        ))}
        <ol className="mt-14 flex flex-col gap-14">
          {picks.map((l, i) => (
            <li key={l.id}>
              <Link href={paths.listing(l.id)} className="group block">
                <Photo
                  id={l.photo}
                  alt={l.title}
                  className="aspect-[16/9] rounded-lg"
                />
                <p className="text-fg-3 mt-5 text-sm font-bold">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <Kicker listing={l} className="mt-1 text-[15px]" />
                <h2 className="group-hover:text-accent mt-2 text-3xl font-semibold tracking-tight">
                  {l.title}
                </h2>
                <p className="text-fg-2 mt-2">{l.blurb}</p>
                <p className="text-fg-3 mt-3 text-[15px]">
                  {whenLine(l)} ·{' '}
                  <span className="text-fg font-medium">{priceOf(l)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </article>
      <section className="mt-[clamp(100px,8vw,160px)]">
        <SectionHeader title="More from the digest" />
        <Rail>
          {others.map((d) => (
            <DigestCard key={d.id} issue={d} />
          ))}
        </Rail>
      </section>
    </div>
  );
}
