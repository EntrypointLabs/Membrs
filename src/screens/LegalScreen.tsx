import { legalDocument } from '../lib/api';
import { CONTACT } from '../lib/config';
import { navigate, paths } from '../lib/router';
import type { LegalSlug } from '../lib/types';
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
 * The legal pages, centred: the documents as tabs, numbered sections, and a
 * readable 640px column even though the text is centred.
 */
export function LegalScreen({ doc }: { doc: LegalSlug }) {
  const d = legalDocument(doc);
  return (
    <article className="page mx-auto max-w-[860px] pt-10 pb-10 text-center md:pt-20">
      <p className="text-fg-3 flex justify-center gap-2.5 font-medium">
        Legal <span className="opacity-50">·</span> Last updated {d.updated}
      </p>
      <h1 className="mt-4 mb-9 text-[clamp(36px,5vw,72px)] leading-none font-semibold tracking-tight">
        {d.title}
      </h1>
      <Tabs
        label="Legal documents"
        value={doc}
        options={DOCS}
        onChange={(v) => navigate(paths.legal(v))}
      />
      <p className="mx-auto mt-16 mb-18 max-w-[680px] text-[clamp(19px,1.5vw,22px)] leading-relaxed font-medium">
        <RichText text={d.intro} />
      </p>
      {d.sections.map((s, i) => (
        <section key={s.heading} className="mx-auto mb-16 max-w-[640px]">
          <span className="bg-soft text-fg-3 mb-3.5 inline-grid h-7 min-w-9 place-items-center rounded-sm px-2.5 text-[13px] font-bold tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h2 className="mb-4 text-[clamp(24px,2vw,30px)] font-bold tracking-tight">
            {titleCase(s.heading)}
          </h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="text-fg-2 mb-3.5 text-[17px] leading-[1.7]">
              <RichText text={p} />
            </p>
          ))}
        </section>
      ))}
      <p className="border-line text-fg-3 mx-auto max-w-[640px] border-t pt-8">
        Questions? Email{' '}
        <a
          href={`mailto:${CONTACT.hello}`}
          className="text-brand dark:text-accent font-semibold"
        >
          {CONTACT.hello}
        </a>
      </p>
    </article>
  );
}
