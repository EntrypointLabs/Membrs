import { CONTACT } from '../lib/config';
import { cityStore } from '../lib/preferences';
import { shown } from '../lib/sections';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { LEGAL_TITLES } from '../lib/title';
import type { LegalSlug } from '../lib/types';
import { openOverlay } from '../lib/ui';
import { DigestForm } from './DigestForm';
import { Icon } from './Icon';
import { Link } from './Link';

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Explore',
    links: [
      ['Events', paths.feed('events')],
      ['Opportunities', paths.feed('opportunities')],
      ...(shown('places')
        ? [['Places', paths.feed('places')] as [string, string]]
        : []),
      ...(shown('promos')
        ? [['Promos', paths.feed('promos')] as [string, string]]
        : []),
    ],
  },
  {
    title: 'Contribute',
    links: [
      ['List an event', paths.contribute('event')],
      ['Submit an opportunity', paths.contribute('opportunity')],
      ...(shown('place')
        ? [['Add a place', paths.contribute('place')] as [string, string]]
        : []),
      ...(shown('promo')
        ? [['Feature a promo', paths.contribute('promo')] as [string, string]]
        : []),
      ['Advertise', paths.contribute('ad')],
    ],
  },
  {
    title: 'Legal',
    links: (Object.keys(LEGAL_TITLES) as LegalSlug[]).map((doc) => [
      LEGAL_TITLES[doc],
      paths.legal(doc),
    ]),
  },
];

export function Footer() {
  const city = useStore(cityStore);
  return (
    <footer className="page mt-[clamp(120px,9vw,180px)] max-md:hidden">
      <div className="bg-inv text-inv-fg rounded-t-lg px-[clamp(32px,4.5vw,88px)] pt-[clamp(64px,5.5vw,104px)] pb-10 shadow-[0_-24px_60px_rgb(0_0_0/0.18)]">
        {/* Same four columns as the links below, so the sign-up sits exactly in the Contact column. */}
        <div className="grid items-center gap-10 md:grid-cols-2 lg:grid-cols-4">
          <h2 className="text-[clamp(26px,2.3vw,38px)] leading-tight font-medium tracking-tight lg:col-span-3">
            {/* One headline, broken before "in" so it reads as two lines. */}
            {titleCase(`Get the best of ${city} in your inbox every Sunday.`)
              .split(' in ')
              .map((part, i) => (
                <span key={part} className="block">
                  {i ? `in ${part}` : part}
                </span>
              ))}
          </h2>
          <DigestForm />
        </div>

        <div className="mt-[clamp(56px,5vw,88px)] mb-[clamp(40px,3.5vw,56px)] flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-2.5">
            <Link
              href="/"
              className="text-[clamp(34px,2.6vw,44px)] leading-none font-black tracking-[-0.05em]"
            >
              MEMBRS
            </Link>
            <p className="text-inv-fg-2 text-[15px]">
              © 2026 MEMBRS. All rights reserved.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 pb-[clamp(32px,3vw,48px)] lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col items-start gap-2">
              <h3 className="mb-2 text-[17px] font-bold">{col.title}</h3>
              {col.links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-inv-fg-2 hover:text-inv-fg text-base"
                >
                  {titleCase(label)}
                </Link>
              ))}
              {col.title === 'Legal' && (
                <button
                  type="button"
                  onClick={() => openOverlay('cookies')}
                  className="text-inv-fg-2 hover:text-inv-fg text-base"
                >
                  Cookie Settings
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-col items-start gap-2">
            <h3 className="mb-2 text-[17px] font-bold">Contact</h3>
            {[CONTACT.hello, CONTACT.report, CONTACT.ads].map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="text-inv-fg-2 hover:text-inv-fg group flex items-center gap-1.5 text-base"
              >
                {email}
                <Icon
                  name="arrowUpRight"
                  className="text-inv-fg-3 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
