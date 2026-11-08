import { CONTACT } from '../lib/config';
import { cityStore } from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { openOverlay } from '../lib/ui';
import { DigestForm } from './DigestForm';
import { Icon, type IconName } from './Icon';
import { Link } from './Link';

const SOCIALS: { name: string; href: string; icon: IconName }[] = [
  { name: 'Instagram', href: 'https://instagram.com/', icon: 'instagram' },
  { name: 'X', href: 'https://x.com/', icon: 'xLogo' },
  { name: 'LinkedIn', href: 'https://linkedin.com/', icon: 'linkedin' },
  { name: 'WhatsApp', href: 'https://whatsapp.com/', icon: 'whatsapp' },
];

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Explore',
    links: [
      ['Events', paths.feed('events')],
      ['Opportunities', paths.feed('opportunities')],
      ['Places', paths.feed('places')],
      ['Promos', paths.feed('promos')],
      ['The Digest', paths.digest()],
    ],
  },
  {
    title: 'Contribute',
    links: [
      ['List an event', paths.contribute('event')],
      ['Submit an opportunity', paths.contribute('opportunity')],
      ['Add a place', paths.contribute('place')],
      ['Feature a promo', paths.contribute('promo')],
      ['Advertise', paths.contribute('ad')],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Terms of Service', paths.legal('terms')],
      ['Privacy Policy', paths.legal('privacy')],
      ['Cookie Policy', paths.legal('cookies')],
      ['Listing Guidelines', paths.legal('guidelines')],
      ['Advertising Policy', paths.legal('advertising')],
    ],
  },
];

/**
 * The footer: one panel that flips against the page (white in dark mode,
 * near-black in light), rising from the bottom of the page. Digest signup on
 * top, the wordmark, four link columns, then the copyright and socials.
 */
export function Footer() {
  const city = useStore(cityStore);
  return (
    <footer className="mx-auto mt-[clamp(120px,9vw,180px)] w-[min(120%,calc(100vw-32px))] max-w-[calc(var(--container-page)*1.2)] max-md:hidden">
      <div className="bg-inv text-inv-fg rounded-t-lg px-[clamp(40px,7vw,140px)] pt-[clamp(64px,5.5vw,104px)] pb-10 shadow-[0_-24px_60px_rgb(0_0_0/0.18)]">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-[clamp(40px,6vw,120px)]">
          <h2 className="text-[clamp(26px,2.3vw,38px)] leading-tight font-medium tracking-tight">
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

        <Link
          href="/"
          className="mt-[clamp(56px,5vw,88px)] mb-[clamp(40px,3.5vw,60px)] inline-block text-[clamp(34px,2.6vw,44px)] leading-none font-black tracking-[-0.05em]"
        >
          MEMBRS
        </Link>

        <div className="border-inv-line grid grid-cols-2 gap-10 border-b pb-[clamp(40px,3.5vw,56px)] lg:grid-cols-4">
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

        <div className="flex flex-wrap items-center justify-between gap-5 pt-7">
          <p className="text-inv-fg-2 text-[15px]">
            © 2026 MEMBRS. All rights reserved.
          </p>
          <ul className="flex gap-2">
            {SOCIALS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  aria-label={s.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-inv-fg grid h-[42px] w-[42px] place-items-center rounded-sm bg-[color-mix(in_srgb,var(--inv-fg)_6%,var(--inv))] transition-transform hover:-translate-y-0.5"
                >
                  <Icon name={s.icon} className="h-[17px] w-[17px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
