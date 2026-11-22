import type { MouseEvent } from 'react';
import { area, context, itemRef, track } from '../lib/analytics';
import { promoById, promos } from '../lib/api';
import { paths } from '../lib/router';
import { copyText, toast } from '../lib/ui';
import { Icon } from '../components/Icon';
import { PromoCard, promoEnds } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  AboutBlock,
  ActionCard,
  Block,
  DetailBody,
  DetailHead,
  LinkRow,
  OverlayButton,
  PrimaryLink,
  Fact,
  shareAndConfirm,
  SmallButton,
} from './DetailParts';
import { SeeAll } from '../components/PhoneList';
import { NotFoundScreen } from './NotFoundScreen';
import { GRID_COLUMNS } from '../lib/config';

export function PromoScreen({ id }: { id: string }) {
  const promo = promoById(id);
  if (!promo) return <NotFoundScreen />;
  const more = promos()
    .filter((p) => p.id !== promo.id)
    .slice(0, GRID_COLUMNS);
  const item = itemRef.promo(promo);
  const copyCode = async (e: MouseEvent<HTMLElement>) => {
    if (!promo.code) return;
    const button = e.currentTarget;
    const copied = await copyText(promo.code);
    if (copied)
      track('promo_code_copied', { ...item, code: promo.code }, button);
    toast(copied ? `Code ${promo.code} copied` : `Code ${promo.code}`);
  };
  const onShare = (e: MouseEvent<HTMLElement>) =>
    shareAndConfirm(promo.title, item, e.currentTarget);
  return (
    <div className="page max-md:pt-0 md:pt-10" {...context(item)}>
      <DetailHead
        trail={[
          ['Promos', paths.feed('promos')],
          [promo.category, paths.feed('promos')],
        ]}
        title={promo.title}
        photo={{ id: promo.photo }}
        tools={
          <OverlayButton
            icon="share"
            label="Share"
            action="share"
            onClick={onShare}
          />
        }
      />
      <DetailBody
        about={
          <AboutBlock
            title="About This Deal"
            paragraphs={[promo.blurb]}
            className=""
          />
        }
        primary={
          <>
            {promo.code && (
              <button
                type="button"
                onClick={copyCode}
                {...context({ action: 'copy_code' })}
                className="border-line-2 flex h-12 w-full items-center justify-between rounded-md border border-dashed px-4 font-mono font-bold"
              >
                {promo.code} <Icon name="copy" />
              </button>
            )}
            <PrimaryLink
              href={`https://${promo.host}`}
              item={item}
              cta="go_to_merchant"
            >
              {`Go to ${promo.merchant}`}
            </PrimaryLink>
          </>
        }
        links={
          <>
            <LinkRow
              icon="spark"
              label="Find similar"
              action="find_similar"
              href={paths.feed('promos')}
              onClick={(e) =>
                track('find_similar_clicked', item, e.currentTarget)
              }
            />
            <LinkRow
              icon="share"
              label="Share with a friend"
              action="share"
              onClick={onShare}
            />
          </>
        }
        action={
          <ActionCard>
            <p className="text-fg-3 text-sm">Offer</p>
            <p className="text-3xl font-semibold tracking-tight">
              {promo.offer}
            </p>
            {promo.code ? (
              <button
                type="button"
                onClick={copyCode}
                {...context({ action: 'copy_code' })}
                className="border-line-2 mt-5 flex h-12 w-full items-center justify-between rounded-md border border-dashed px-4 font-mono font-bold"
              >
                {promo.code} <Icon name="copy" />
              </button>
            ) : (
              <p className="text-fg-3 mt-3 text-sm">No code needed.</p>
            )}
            <div className="mt-4">
              <PrimaryLink
                href={`https://${promo.host}`}
                item={item}
                cta="go_to_merchant"
              >
                {`Go to ${promo.merchant}`}
              </PrimaryLink>
            </div>
            <div className="mt-3">
              <SmallButton action="share" onClick={onShare}>
                Share
              </SmallButton>
            </div>
          </ActionCard>
        }
      >
        <dl {...area('facts')}>
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
      </DetailBody>
      <section className="mt-[clamp(100px,8vw,160px)]" {...area('more_promos')}>
        <SectionHeader
          title="More promos"
          count={more.length}
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
