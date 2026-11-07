import { paths } from '../lib/router';
import type { DigestIssue } from '../lib/types';
import { Link } from './Link';
import { Photo } from './Photo';

export function DigestCard({ issue }: { issue: DigestIssue }) {
  return (
    <Link href={paths.issue(issue.id)} className="group flex h-full flex-col">
      <Photo
        id={issue.photo}
        alt={issue.title}
        className="aspect-[4/3] rounded-md"
      />
      <p className="text-fg-3 mt-3 flex gap-1.5 text-[13px] md:mt-5 md:text-[15px]">
        <span className="text-fg font-semibold">{issue.type}</span>·{' '}
        {issue.city} · No. {issue.number}
      </p>
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {issue.title}
      </h3>
      <p className="text-fg-2 mt-2 line-clamp-2">{issue.dek}</p>
      <p className="text-fg-3 mt-auto flex justify-between pt-2 text-[13px] md:pt-3 md:text-[15px]">
        <span>{issue.date.replace(' 2026', '')}</span>
        <span>
          {issue.readMinutes} min · {issue.listingIds.length} picks
        </span>
      </p>
    </Link>
  );
}
