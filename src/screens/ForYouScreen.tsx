import { area } from '../lib/analytics';
import {
  FOR_YOU_SECTION,
  forYouStore,
  LARGEST_SECTION_WINDOW,
  useHomeSection,
  type HomeParams,
} from '../lib/api';
import { homeParamsOf, useReader } from '../lib/homeParams';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay } from '../lib/ui';
import { PageTitle } from '../components/PageTitle';
import { TitleBar } from '../components/TitleBar';
import { ListingResults } from './FeedLayout';

const EVERY_MATCH = {
  id: FOR_YOU_SECTION,
  offset: 0,
  limit: LARGEST_SECTION_WINDOW,
};

function forYouParamsOf(home: HomeParams): HomeParams | null {
  if (!home.interests?.length) return null;
  return {
    layout: home.layout,
    country: home.country,
    state: '',
    viewed: [],
    interests: home.interests,
  };
}

export function ForYouScreen() {
  const signedIn = useStore(forYouStore);
  const params = forYouParamsOf(homeParamsOf(false, useReader()));
  const linked = useHomeSection(signedIn.length ? null : params, EVERY_MATCH);
  const items = signedIn.length
    ? signedIn
    : (linked.data?.sections[0]?.items ?? []);
  return (
    <div className="page pt-0 md:pt-16">
      <TitleBar desktop>
        <PageTitle
          section="Home"
          sectionHref={paths.home()}
          current="For You"
          muted
          onOpen={() => openOverlay('prefs')}
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
