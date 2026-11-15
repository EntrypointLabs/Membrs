import { area } from '../lib/analytics';
import { forYou } from '../lib/api';
import { interestsStore } from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { PageTitle } from '../components/PageTitle';
import { TitleBar } from '../components/TitleBar';
import { ListingResults } from './FeedLayout';

/** Every listing that matches the reader's interests, soonest first. */
export function ForYouScreen() {
  const interests = useStore(interestsStore);
  const items = forYou(interests);
  return (
    <div className="page pt-0 md:pt-16">
      <TitleBar desktop>
        <PageTitle
          section="Home"
          sectionHref={paths.home()}
          current="For You"
          count={items.length}
        />
      </TitleBar>
      <div {...area('for_you_listings')}>
        <ListingResults
          items={items}
          empty="Pick a few interests and your matches show up here."
        />
      </div>
    </div>
  );
}
