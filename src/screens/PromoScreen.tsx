import { area, context, itemRef, track } from '../lib/analytics';
import { promoById, promos } from '../lib/api';
import { paths } from '../lib/router';
import { toast } from '../lib/ui';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { PromoCard, promoEnds } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  AboutBlock,
  ActionCard,
  Block,
  Crumbs,
  Fact,
  share,
  SmallButton,
} from './DetailParts';
import { SeeAll } from './HomeScreen';
import { NotFoundScreen } from './NotFoundScreen';

export function PromoScreen({ id }: { id: string }) {
  const promo = promoById(id);
  if (!promo) return <NotFoundScreen />;
  const more = promos()
    .filter((p) => p.id !== promo.id)
    .slice(0, 3);
  const item = itemRef.promo(promo);
  const copyCode = async () => {
    if (!promo.code) return;
    track('promo_code_copied', { ...item, code: promo.code });
    await navigator.clipboard?.writeText(promo.code);
    toast(`Code ${promo.code} copied`);
  };
  return (
    <div className="page pt-6 md:pt-10" {...context(item)}>
      <Crumbs
        trail={[
          ['Promos', paths.feed('promos')],
          [promo.category, paths.feed('promos')],
        ]}
      />
      <header className="mt-8">
        <h1 className="text-[clamp(34px,4vw,68px)] leading-[1.04] font-semibold tracking-tight text-pretty">
          {promo.title}
        </h1>
      </header>
      <Photo
        size="wide"
        id={promo.photo}
        alt={promo.title}
        priority
        className="mt-10 aspect-[2/1] rounded-lg"
      />
      <AboutBlock title="About This Deal" paragraphs={[promo.blurb]} />
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(360px,24vw,460px)] lg:gap-16">
        <div>
          <dl className="border-line border-t" {...area('facts')}>
            <Fact label="Offer">
              <p className="font-semibold">{promo.offer}</p>
            </Fact>
            <Fact label="Where">
              <p className="font-semibold">{promo.where}</p>
              <p className="text-fg-3 text-[15px]">{promo.city}</p>
            </Fact>
            <Fact label="Ends">
              <p className="font-semibold">{promoEnds(promo)}</p>
            </Fact>
          </dl>
          <Block title="How to get it">
            <ol className="flex flex-col gap-4">
              {promo.steps.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="bg-soft text-fg-3 grid h-8 w-8 shrink-0 place-items-center rounded-sm text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-fg-2 pt-1">{s}</span>
                </li>
              ))}
            </ol>
          </Block>
          <Block title="Good to know">
            <ul className="text-fg-3 flex list-disc flex-col gap-2 pl-5">
              {promo.finePrint.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Block>
        </div>
        <ActionCard>
          <p className="text-fg-3 text-sm">Offer</p>
          <p className="text-3xl font-semibold tracking-tight">{promo.offer}</p>
          {promo.code ? (
            <button
              type="button"
              onClick={copyCode}
              className="border-line-2 mt-5 flex h-12 w-full items-center justify-between rounded-md border border-dashed px-4 font-mono font-bold"
            >
              {promo.code} <Icon name="copy" />
            </button>
          ) : (
            <p className="text-fg-3 mt-3 text-sm">No code needed.</p>
          )}
          <a
            href={`https://${promo.host}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track('listing_cta_clicked', { ...item, cta: 'go_to_merchant' })
            }
            {...context({ action: 'go_to_merchant' })}
            className="bg-brand hover:bg-brand-hover mt-4 flex h-12 items-center justify-center gap-1.5 rounded-md font-bold text-white"
          >
            Go to {promo.merchant}{' '}
            <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
          </a>
          <div className="mt-3">
            <SmallButton
              onClick={async () => {
                const method = await share(promo.title);
                track('item_shared', {
                  ...item,
                  method: method === 'copied' ? 'copied' : 'share_sheet',
                });
                if (method === 'copied') toast('Link copied');
              }}
            >
              Share
            </SmallButton>
          </div>
        </ActionCard>
      </div>
      <section className="mt-[clamp(100px,8vw,160px)]" {...area('more_promos')}>
        <SectionHeader
          title="More promos"
          actions={<SeeAll href={paths.feed('promos')}>All promos</SeeAll>}
        />
        <Rail>
          {more.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </Rail>
      </section>
    </div>
  );
}
