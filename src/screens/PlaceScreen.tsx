import { placeById, places } from '../lib/api';
import { WEEKDAYS } from '../lib/dates';
import { openStateNow, rangeLabel } from '../lib/hours';
import { paths } from '../lib/router';
import { slugify } from '../lib/text';
import { toast } from '../lib/ui';
import { Icon } from '../components/Icon';
import { PlaceCard } from '../components/PlaceCard';
import { Photo } from '../components/Photo';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  AboutBlock,
  ActionCard,
  Block,
  Crumbs,
  Fact,
  FactAction,
  MapCard,
  share,
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
  return (
    <div className="page pt-6 md:pt-10">
      <Crumbs
        trail={[
          ['Places', paths.feed('places')],
          [place.type, `${paths.feed('places')}?type=${slugify(place.type)}`],
        ]}
      />
      <header className="mt-8">
        <h1 className="text-[clamp(34px,4vw,68px)] leading-[1.04] font-semibold tracking-tight text-pretty">
          {place.name}
        </h1>
      </header>
      <Photo
        size="wide"
        id={place.photo}
        alt={place.name}
        priority
        className="mt-10 aspect-[2/1] rounded-lg"
      />
      <AboutBlock title="About This Place" paragraphs={[place.about]} />
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(360px,24vw,460px)] lg:gap-16">
        <div>
          <dl className="border-line border-t">
            <Fact label="Today">
              <p className="font-semibold">{state.label}</p>
              <p className="text-fg-3 text-[15px]">{state.detail}</p>
            </Fact>
            <Fact
              label="Where"
              action={<FactAction href={maps}>Directions</FactAction>}
            >
              <p className="font-semibold">{place.area}</p>
              <p className="text-fg-3 text-[15px]">{place.city}</p>
            </Fact>
            <Fact label="Entry">
              <p className="font-semibold">
                {place.entry || 'Pay at the gate'}
              </p>
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
        </div>
        <ActionCard>
          <p className="text-fg-3 text-sm">Entry</p>
          <p className="text-3xl font-semibold tracking-tight">
            {place.entry || 'See gate'}
          </p>
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand hover:bg-brand-hover mt-5 flex h-12 items-center justify-center gap-1.5 rounded-md font-bold text-white"
          >
            Get directions <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
          </a>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SmallButton href={paths.feed('places')}>Find similar</SmallButton>
            <SmallButton
              onClick={async () =>
                (await share(place.name)) === 'copied' && toast('Link copied')
              }
            >
              Share
            </SmallButton>
          </div>
        </ActionCard>
      </div>
      {more.length > 0 && (
        <section className="mt-[clamp(100px,8vw,160px)]">
          <SectionHeader
            title="More like this"
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
