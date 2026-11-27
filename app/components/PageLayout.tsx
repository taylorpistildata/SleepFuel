import {Link, useLocation} from 'react-router';
import {PurchaseStateProvider} from '~/lib/purchaseState';
import {useId} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {CartDrawer} from '~/components/CartDrawer';
import {MobileMenu} from '~/components/MobileMenu';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {EmailCapturePopup} from '~/components/EmailCapturePopup';
import {PromoTicker} from '~/components/PromoTicker';
import {SALE_PATH, isSaleLive} from '~/lib/blackFriday';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery | null;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      {/* Wraps the whole tree so the buy box, the sticky add-to-cart bar, and
          the analytics payload share one selection even when Weaverse renders
          those sections independently. */}
      <PurchaseStateProvider>
        <CartDrawer cart={cart} />
        <SearchAside />
        <MobileMenu cart={cart} isLoggedIn={isLoggedIn} />
        <PromoTicker />
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
        {/* The header is a fixed floating pill on mobile, so it would sit over
          the top of the page content — it overlapped the hero product images
          by 76px. Reserve its height below the ticker so the nav sits above
          the content rather than on it. At sm+ the header is sticky in flow
          and needs no allowance.

          pt-20 is 5rem = 80px. The header's own height is 72px, but it is
          pinned at top-12 (48px) while the ticker above it is only 45px tall,
          so clearing it needs 48 + 72 - 45 = 75px. 80px leaves a small buffer
          rather than sitting exactly flush, since the ticker's height depends
          on the loaded font. Written as a standard utility because arbitrary
          values carrying a var() do not compile in this setup. */}
        <main className="grow min-h-[60vh] overflow-x-hidden pt-20 sm:pt-0">
          {children}
        </main>
        <Footer
          footer={footer}
          header={header}
          publicStoreDomain={publicStoreDomain}
        />
        <SignupPopup />
      </PurchaseStateProvider>
    </Aside.Provider>
  );
}

/**
 * Email/SMS signup popup and its "Save 10%" side tab, everywhere except the
 * Black Friday page while the sale runs: there the popup covered the Claim
 * button and offered a smaller discount than the page.
 */
function SignupPopup() {
  const {pathname} = useLocation();
  if (pathname.replace(/\/$/, '') === SALE_PATH && isSaleLive()) return null;
  return <EmailCapturePopup />;
}

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="SEARCH">
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
              />
              &nbsp;
              <button onClick={goToSearch}>Search</button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div>Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    <p>
                      View all results for <q>{term.current}</q>
                      &nbsp; →
                    </p>
                  </Link>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}
