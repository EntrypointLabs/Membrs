import { area } from '../lib/analytics';
import { useForYou } from '../lib/readerLink';
import { paths } from '../lib/router';
import { openOverlay } from '../lib/ui';
import { PageTitle } from '../components/PageTitle';
import { TitleBar } from '../components/TitleBar';
import { ListingResults } from './FeedLayout';

export function ForYouScreen() {
  const items = useForYou();
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
