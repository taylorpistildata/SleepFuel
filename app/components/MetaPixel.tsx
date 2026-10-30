import {useCallback, useEffect, useRef} from 'react';
import {useAnalytics} from '@shopify/hydrogen';
import {
  CONSENT_POLL_INTERVAL_MS,
  CONSENT_POLL_TIMEOUT_MS,
  type VisitorConsentDetail,
} from '~/components/OpenAiAdsPixel';
import {
  META_PIXEL_ID,
  META_SDK_URL,
  createMetaEventId,
  mapMetaAddToCart,
  mapMetaViewContent,
  urlPath,
  type MetaEventParams,
  type MetaStorefrontEvent,
} from '~/lib/metaPixel';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    /** Set once fbevents.js has been requested and the pixel initialised. */
    __sleepfuelMetaPixelInit?: boolean;
  }
}

/** Same PageView URL inside this window is one view, not two. */
const PAGE_VIEW_DEDUPE_MS = 1000;

/**
 * Whether Meta may receive events, from Shopify's Customer Privacy API.
 *
 * This pixel measures advertising, so marketing consent is what decides it.
 * Hydrogen's Analytics.Provider already withholds every event until the
 * privacy API has loaded and analytics processing is allowed, so by the time
 * an event reaches this component both are known.
 *
 * Returns null while the API has not loaded yet.
 */
export function readMarketingConsent(
  detail?: VisitorConsentDetail,
): boolean | null {
  if (typeof detail?.marketingAllowed === 'boolean') {
    return detail.marketingAllowed;
  }
  if (typeof window === 'undefined') return null;
  const privacy = window.Shopify?.customerPrivacy;
  if (!privacy?.marketingAllowed) return null;
  try {
    return privacy.marketingAllowed();
  } catch {
    // The API throws until it has loaded.
    return null;
  }
}

/**
 * Defines the fbq queue, sets consent, inits the pixel and requests
 * fbevents.js. Runs at most once per document: the window flag survives
 * client side navigation and React remounts, so there is never a second init
 * or a second SDK tag.
 *
 * It is only ever called once consent is granted, so the pixel starts in the
 * granted state; there is no revoke-by-default to undo later.
 */
function bootstrapMetaPixel() {
  if (typeof window === 'undefined' || window.__sleepfuelMetaPixelInit) return;
  window.__sleepfuelMetaPixelInit = true;

  if (!window.fbq) {
    // Meta's standard queue stub, minus its script injection (done below).
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
  }

  window.fbq!('consent', 'grant');
  window.fbq!('init', META_PIXEL_ID);

  if (!document.querySelector(`script[src="${META_SDK_URL}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = META_SDK_URL;
    document.head.appendChild(script);
  }
}

/**
 * The storefront's Meta pixel (1146974057753403).
 *
 * Loads fbevents.js once, inits once, follows Shopify's Customer Privacy API
 * for consent, and forwards Hydrogen analytics events:
 *
 * - PageView     from `page_viewed` (first load and every client navigation)
 * - ViewContent  from `product_viewed`, once per page visit
 * - AddToCart    from `product_added_to_cart`, which Hydrogen publishes after
 *                every successful cart change that adds units: each add to
 *                cart button on the page and the cart drawer's quantity plus
 *
 * Every event carries its own `eventID`.
 *
 * InitiateCheckout, AddPaymentInfo and Purchase are deliberately not sent.
 * Checkout runs on Shopify, which already reports them; sending them here too
 * would double count.
 */
export function MetaPixel() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Meta_Pixel');

  const subscribed = useRef(false);
  /** Last consent value handed to fbq, so it is only called on change. */
  const consentSent = useRef<boolean | null>(null);
  const lastPageView = useRef<{path: string | null; url: string; at: number}>(
    {path: null, url: '', at: 0},
  );
  /** Path ViewContent was sent for; cleared when the shopper leaves it. */
  const viewContentPath = useRef<string | null>(null);

  /**
   * Applies the current consent state. Grants by bootstrapping the pixel
   * (first time) or calling `consent grant`; revokes only a pixel that is
   * already running. Returns whether events may be sent.
   */
  const syncConsent = useCallback((detail?: VisitorConsentDetail) => {
    const allowed = readMarketingConsent(detail);
    if (allowed === null) return false;

    if (allowed) {
      if (!window.__sleepfuelMetaPixelInit) {
        bootstrapMetaPixel();
      } else if (consentSent.current !== true) {
        window.fbq?.('consent', 'grant');
      }
    } else if (window.__sleepfuelMetaPixelInit && consentSent.current !== false) {
      window.fbq?.('consent', 'revoke');
    }
    consentSent.current = allowed;
    return allowed;
  }, []);

  const track = useCallback(
    (event: MetaStorefrontEvent, params?: MetaEventParams | null) => {
      if (!syncConsent()) return;
      const options = {eventID: createMetaEventId(event)};
      if (params) window.fbq?.('track', event, params, options);
      else window.fbq?.('track', event, {}, options);
    },
    [syncConsent],
  );

  // --- consent -------------------------------------------------------------
  useEffect(() => {
    const onConsentCollected = (event: Event) => {
      syncConsent((event as CustomEvent<VisitorConsentDetail>).detail);
    };

    syncConsent();

    let elapsed = 0;
    const interval = window.setInterval(() => {
      elapsed += CONSENT_POLL_INTERVAL_MS;
      if (
        readMarketingConsent() !== null ||
        elapsed >= CONSENT_POLL_TIMEOUT_MS
      ) {
        window.clearInterval(interval);
        syncConsent();
      }
    }, CONSENT_POLL_INTERVAL_MS);

    document.addEventListener('visitorConsentCollected', onConsentCollected);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        'visitorConsentCollected',
        onConsentCollected,
      );
    };
  }, [syncConsent]);

  // --- storefront events ---------------------------------------------------
  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    subscribe('page_viewed', (payload: {url?: string} | undefined) => {
      const url = payload?.url ?? window.location.href;
      const path = urlPath(url);
      const now = Date.now();

      // Leaving a page re-arms ViewContent for the next product page visit.
      if (path !== viewContentPath.current) viewContentPath.current = null;

      // Hydrogen can re-publish the same view when consent state settles.
      const last = lastPageView.current;
      if (last.url === url && now - last.at < PAGE_VIEW_DEDUPE_MS) return;
      lastPageView.current = {path, url, at: now};

      track('PageView');
    });

    subscribe(
      'product_viewed',
      (payload: {url?: string} | undefined) => {
        const path = urlPath(payload?.url ?? window.location.href);
        // Once per page visit: changing pack or purchase mode is not a new view.
        if (path && viewContentPath.current === path) return;
        const params = mapMetaViewContent(payload as never);
        if (!params) return;
        if (!syncConsent()) return;
        viewContentPath.current = path;
        track('ViewContent', params);
      },
    );

    // Published by Hydrogen only after the cart mutation succeeds.
    subscribe('product_added_to_cart', (payload) => {
      const params = mapMetaAddToCart(payload as never);
      if (params) track('AddToCart', params);
    });

    ready();
  }, [subscribe, ready, track, syncConsent]);

  return null;
}
