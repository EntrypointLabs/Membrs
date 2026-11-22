import { use } from 'react';
import { legalDocuments } from '../lib/api';
import { CONTACT } from '../lib/config';
import { navigate, paths } from '../lib/router';
import type { LegalListClause, LegalSlug } from '../lib/types';
import { titleCase } from '../lib/text';
import { RichText } from '../components/RichText';
import { Tabs } from '../components/Tabs';

const DOCS: { value: LegalSlug; label: string }[] = [
  { value: 'terms', label: 'Terms' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'guidelines', label: 'Guidelines' },
  { value: 'advertising', label: 'Advertising' },
];

/**
 * The legal pages, laid out as a contract: numbered sections, clauses numbered
 * within them so a reader or a complaint can cite "clause 11.1", lettered lists,
 * and the date at the end where a revision note belongs.
 */
export function LegalScreen({ doc }: { doc: LegalSlug }) {
  const d = use(legalDocuments())[doc];
  return (
    <article className="page mx-auto max-w-[760px] pt-10 pb-10 md:pt-20">
      <h1 className="mb-8 text-[clamp(36px,5vw,64px)] leading-none font-semibold tracking-tight">
        {titleCase(d.title)}
      </h1>
      <Tabs
        label="Legal documents"
        value={doc}
        options={DOCS}
        onChange={(v) => navigate(paths.legal(v))}
      />
      <p className="text-fg-2 mt-10 mb-12 text-[clamp(18px,1.4vw,20px)] leading-relaxed">
        <RichText text={d.intro} />
      </p>
      <ol className="list-none space-y-12 p-0">
        {d.sections.map((s, i) => (
          <li key={s.heading}>
            <h2 className="mb-4 flex gap-3 text-[clamp(20px,1.8vw,24px)] font-bold tracking-tight">
              <span className="tabular-nums">{`${i + 1}.`}</span>
              {titleCase(s.heading)}
            </h2>
            <ol className="list-none space-y-3 p-0">
              {s.paragraphs.map((clause, j) => (
                <Clause
                  key={typeof clause === 'string' ? clause : clause.text}
                  number={`${i + 1}.${j + 1}`}
                  clause={clause}
                />
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <footer className="border-line text-fg-3 mt-16 space-y-2 border-t pt-8">
        <p>Last updated {d.updated}</p>
        <p>
          Questions? Email{' '}
          <a
            href={`mailto:${CONTACT.hello}`}
            className="text-brand dark:text-accent font-semibold"
          >
            {CONTACT.hello}
          </a>
        </p>
      </footer>
    </article>
  );
}

const HANGING = 'grid grid-cols-[2.75rem_1fr] gap-x-2';

function Clause({
  number,
  clause,
}: {
  number: string;
  clause: string | LegalListClause;
}) {
  const text = typeof clause === 'string' ? clause : clause.text;
  return (
    <li className={`${HANGING} text-fg-2 text-[17px] leading-[1.7]`}>
      <span className="text-fg-3 tabular-nums">{number}</span>
      <div>
        <RichText text={text} />
        {typeof clause !== 'string' && (
          <ol className="mt-2 list-none space-y-1.5 p-0">
            {clause.items.map((item, k) => (
              <li key={item} className={HANGING}>
                <span className="text-fg-3">{`(${String.fromCharCode(97 + k)})`}</span>
                <span>
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}
