import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {withWeaverse} from '@weaverse/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import {PageLayout} from './components/PageLayout';
import {GlobalStyle} from '~/weaverse/style';
import {OpenAiAdsPixel} from '~/components/OpenAiAdsPixel';
import {OPENAI_PIXEL_ID, OPENAI_SDK_URL} from '~/lib/openAiPixel';
import {MetaPixel} from '~/components/MetaPixel';
import {isMetaPixelHost} from '~/lib/metaPixel';

/**
 * ChatGPT Ads measurement pixel — loader, consent default and init.
 *
 * Rendered as markup rather than executed here, so nothing touches `window`
 * or `document` during server rendering, and it runs exactly once per
 * document (no remount or Strict Mode double-fire).
 *
 * Order matters. The docs state consent must be set to false *before* `init`
 * to prevent measurement, so the pixel starts denied and
 * `<OpenAiAdsPixel/>` opens it only once Shopify's customer privacy API says
 * tracking is allowed.
 *
 * The published snippet injects its own <script> into <head> at runtime,
 * which mutates the DOM React is about to hydrate (React #418/#423). The
 * queue stub is inlined instead and the SDK rendered as a real <script
 * async> below; queue semantics are unchanged — calls made before the SDK
 * arrives land in `oaiq.q` and replay on load.
 */
const OPENAI_ADS_BOOTSTRAP = `!function(w){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q}(window);oaiq("consent",false);oaiq("init",{pixelId:${JSON.stringify(
  OPENAI_PIXEL_ID,
)},debug:${import.meta.env.DEV ? 'true' : 'false'}});`;

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {rel: 'preconnect', href: 'https://cdn.shopify.com'},
    {rel: 'preconnect', href: 'https://shop.app'},
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  // Production and Oxygen preview hosts only; local dev never loads it.
  const metaPixelEnabled = isMetaPixelHost(new URL(args.request.url).hostname);

  // Weaverse theme settings drive the ticker, header, footer, and popup copy.
  // The SDK reads them from the ROOT loader specifically (see
  // useCreateThemeSettingsStore -> useRouteLoaderData('root').weaverseTheme),
  // so loading them anywhere else leaves every `useThemeSetting` call falling
  // back to its hardcoded default. Guarded and caught: a Weaverse outage must
  // degrade to the shipped copy, never break the document.
  const weaverseTheme = args.context.weaverse
    ? await args.context.weaverse.loadThemeSettings().catch(() => null)
    : null;

  return {
    ...deferredData,
    ...criticalData,
    weaverseTheme,
    metaPixelEnabled,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront
      .query(HEADER_QUERY, {
        cache: storefront.CacheLong(),
        variables: {
          headerMenuHandle: 'main-menu', // Adjust to your header menu handle
        },
      })
      .catch((error: Error) => {
        // Storefront may not have a menu configured yet — render anyway.
        console.error('HEADER_QUERY failed:', error.message);
        return null;
      }),
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart, env} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

/**
 * Wrapped with `withWeaverse` rather than the default `App` export: Weaverse
 * v5 needs its providers *above* the document boundary for theme settings and
 * Studio design mode to initialize.
 */
export const Layout = withWeaverse(function RootLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Kept after charset/viewport — those must come first for correct
            document parsing — but ahead of styles and app scripts. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{__html: OPENAI_ADS_BOOTSTRAP}}
        />
        <script nonce={nonce} async src={OPENAI_SDK_URL} />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
        <GlobalStyle />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
});

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <OpenAiAdsPixel />
      {/* Meta pixel: loads fbevents.js and inits client side, once. */}
      {data.metaPixelEnabled ? <MetaPixel /> : null}
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
