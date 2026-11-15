import type { MouseEvent } from 'react';
import { area, context, itemRef, track } from '../lib/analytics';
import { placeById, places } from '../lib/api';
import { WEEKDAYS } from '../lib/dates';
import { openStateNow, rangeLabel } from '../lib/hours';
import { paths } from '../lib/router';
import { slugify } from '../lib/text';
import { PlaceCard } from '../components/PlaceCard';
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
  FactAction,
  MapCard,
  shareAndConfirm,
  SmallButton,
} from './DetailParts';
import { SeeAll } from './HomeScreen';
import { NotFoundScreen } from './NotFoundScreen';

export function PlaceScreen({ id }: { id: string }) {
  const place = placeById(id);
  if (!place) return <NotFoundScreen />;
  const state = openStateNow(place);
  const today = (new Date().getDay() + 6) % 7;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.area}, ${place.city}`)}`;
  const more = places()
    .filter(
      (p) =>
        p.id !== place.id && (p.type === place.type || p.city === place.city),
    )
    .slice(0, 3);
  const item = itemRef.place(place);
  const findSimilar = (e: MouseEvent<HTMLElement>) =>
    track('find_similar_clicked', item, e.currentTarget);
  const onShare = (e: MouseEvent<HTMLElement>) =>
    shareAndConfirm(place.name, item, e.currentTarget);
  return (
    <div className="page max-md:pt-0 md:pt-10" {...context(item)}>
      <DetailHead
        trail={[
          ['Places', paths.feed('places')],
          [place.type, `${paths.feed('places')}?type=${slugify(place.type)}`],
        ]}
        title={place.name}
        photo={{ id: place.photo }}
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
            title="About This Place"
            paragraphs={[place.about]}
            className=""
          />
        }
        primary={
          <PrimaryLink href={maps} item={item} cta="get_directions">
            Get directions
          </PrimaryLink>
        }
        links={
          <>
            <LinkRow
              icon="spark"
              label="Find similar"
              action="find_similar"
              href={paths.feed('places')}
              onClick={findSimilar}
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
            <p className="text-fg-3 text-sm">Entry</p>
            <p className="text-3xl font-semibold tracking-tight">
              {place.entry || 'See gate'}
            </p>
            <div className="mt-5">
              <PrimaryLink href={maps} item={item} cta="get_directions">
                Get directions
              </PrimaryLink>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SmallButton
                href={paths.feed('places')}
                action="find_similar"
                onClick={findSimilar}
              >
                Find similar
              </SmallButton>
              <SmallButton action="share" onClick={onShare}>
                Share
              </SmallButton>
            </div>
          </ActionCard>
        }
      >
        <dl {...area('facts')}>
          <Fact label="Today">
            <p className="font-semibold">{state.label}</p>
            <p className="text-fg-3 text-[15px]">{state.detail}</p>
          </Fact>
          <Fact
            label="Where"
            action={
              <FactAction href={maps} action="directions">
                Directions
              </FactAction>
            }
          >
            <p className="font-semibold">{place.area}</p>
            <p className="text-fg-3 text-[15px]">{place.city}</p>
          </Fact>
          <Fact label="Entry">
            <p className="font-semibold">{place.entry || 'Pay at the gate'}</p>
          </Fact>
        </dl>
        <Block title="Opening hours">
          <table className="w-full text-[15px]">
            <tbody>
              {WEEKDAYS.map((d, i) => (
                <tr
                  key={d}
                  className={`border-line border-b ${i === today ? 'text-fg font-semibold' : 'text-fg-2'}`}
                >
                  <th scope="row" className="py-3 text-left font-medium">
                    {d}
                    {i === today && (
                      <span className="text-accent ml-2 text-xs uppercase">
                        Today
                      </span>
                    )}
                  </th>
                  <td className="py-3 text-right">
                    {rangeLabel(place.hours[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Good for">
          <div className="flex flex-wrap gap-2">
            {place.goodFor.map((g) => (
              <span
                key={g}
                className="bg-btn rounded-sm px-3 py-1.5 text-sm font-medium"
              >
                {g}
              </span>
            ))}
          </div>
        </Block>
        <MapCard name={place.name} area={`${place.area}, ${place.city}`} />
      </DetailBody>
      {more.length > 0 && (
        <section
          className="mt-[clamp(100px,8vw,160px)]"
          {...area('more_like_this')}
        >
          <SectionHeader
            title="More like this"
            count={more.length}
            actions={<SeeAll href={paths.feed('places')}>All places</SeeAll>}
          />
          <Rail>
            {more.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </Rail>
        </section>
      )}
    </div>
  );
}
