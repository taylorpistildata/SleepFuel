import {forwardRef} from 'react';
import {
  createSchema,
  type ComponentLoaderArgs,
  type HydrogenComponentProps,
} from '@weaverse/hydrogen';
import {AddToCartButton} from '~/components/AddToCartButton';
import {Stars, formatCount} from '~/components/Stars';
import reviewsData from '~/data/reviews.json';
import {useAside} from '~/components/Aside';
import {usePurchaseState} from '~/lib/purchaseState';
import {
  FALLBACK_VARIANT_INFO,
  fetchVariantData,
  type VariantInfoMap,
} from '~/lib/variantData';
import heroImage from '~/assets/hero.jpg';
import heroVideo from '~/assets/hero-video.mp4';
import {autoplayVideo} from '~/lib/autoplayVideo';
import {
  BEST_VALUE_KEY,
  PACK_ORDER,
  PRODUCT,
  SUBSCRIBE_DISCOUNT,
  VARIANTS,
  formatPrice,
  priceFrom,
  sellingPlanFor,
} from '~/lib/sleepfuelProduct';

const REVIEW_AVERAGE = reviewsData.average;
const REVIEW_TOTAL = reviewsData.total;

export type HeroImage = {url: string; altText: string};
export type ReviewSnippet = {value: string} | null;

type HeroProps = Partial<HydrogenComponentProps> & {
  heroImages?: HeroImage[];
  variantInfo?: VariantInfoMap;
  heading?: string;
  tagline?: string;
  sizeLegend?: string;
  subscribeLabel?: string;
  subscribeNote?: string;
  onetimeLabel?: string;
  onetimeNote?: string;
  ctaPrefix?: string;
  badgeOne?: string;
  badgeTwo?: string;
  loaderData?: {
    heroImages: HeroImage[];
  };
};

/**
 * Split hero: looping product video bleeding off the left edge, buy box right.
 *
 * Pack and purchase-mode selection come from `usePurchaseState` rather than
 * props so the sticky bar and analytics stay in sync even when Weaverse
 * renders this section on its own. Pricing, variants, and selling plans stay
 * in code — only the surrounding copy is schema-driven.
 */
const Hero = forwardRef<HTMLElement, HeroProps>(function Hero(
  {
    heroImages,
    variantInfo,
    heading,
    tagline,
    sizeLegend,
    subscribeLabel,
    subscribeNote,
    onetimeLabel,
    onetimeNote,
    ctaPrefix,
    badgeOne,
    badgeTwo,
    loaderData,
    children,
    ...rest
  },
  ref,
) {
  const {packKey, setPackKey, mode, setMode} = usePurchaseState();
  const images = heroImages ?? loaderData?.heroImages ?? [];
  // Live Shopify price and stock; falls back to the bundled constants.
  const info = variantInfo ?? loaderData?.variantInfo ?? FALLBACK_VARIANT_INFO;
  const packSoldOut = !info[packKey].available;
  const {open} = useAside();
  const variant = VARIANTS[packKey];
  const {base, final} = priceFrom(info[packKey].price, mode);
  const showStrike = mode === 'subscribe';
  const sellingPlanId =
    mode === 'subscribe' ? sellingPlanFor(packKey) : undefined;

  return (
    <section
      ref={ref}
      {...rest}
      className="grid items-stretch overflow-hidden lg:grid-cols-[1.05fr_1fr]"
    >
      {/* Left: product image — rounded on the visible (right) side, bleeds
          completely off the left edge of the page. */}
      <div className="relative min-h-[52vh] lg:min-h-[88vh]">
        <HeroVisual images={images} />
      </div>

      {/* Right: buy box */}
      <div className="flex items-center px-5 pt-12 pb-6 sm:px-8 sm:py-12 lg:px-14 lg:py-20">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[54px] font-normal leading-[1.05] tracking-tight sm:text-[72px]">
            {heading}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[color:var(--color-muted)]">
            {tagline}
          </p>

          {/* Rating summary from app/data/reviews.json, linking to the full
              list below. */}
          <a
            href="#reviews"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[color:var(--color-muted)] outline-none hover:text-[color:var(--color-ink)] focus-visible:text-[color:var(--color-blue)]"
          >
            <Stars rating={REVIEW_AVERAGE} size={16} />
            <span className="font-medium text-[color:var(--color-ink)]">
              {REVIEW_AVERAGE.toFixed(1)}
            </span>
            <span>({formatCount(REVIEW_TOTAL)} reviews)</span>
          </a>

          {/* Pack selector */}
          <fieldset className="mt-8">
            <legend className="text-sm font-medium text-[color:var(--color-ink)]">
              {sizeLegend}
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {PACK_ORDER.map((k) => {
                const v = VARIANTS[k];
                const p = priceFrom(info[k].price, mode);
                const selected = packKey === k;
                const recommended = k === BEST_VALUE_KEY;
                const soldOut = !info[k].available;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPackKey(k)}
                    aria-pressed={selected}
                    className={`relative rounded-2xl border bg-white p-3 text-left transition-all ${
                      selected
                        ? 'border-[color:var(--color-ink)] ring-1 ring-[color:var(--color-ink)]'
                        : 'border-[color:var(--color-border)] hover:border-[color:var(--color-muted)]'
                    }${soldOut ? ' opacity-55' : ''}`}
                  >
                    {recommended && !soldOut && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[color:var(--color-blue)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Best value
                      </span>
                    )}
                    {soldOut && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[color:var(--color-muted)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Sold out
                      </span>
                    )}
                    <span className="block text-sm font-semibold">
                      {v.servings} Nights
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[color:var(--color-muted)]">
                      {formatPrice(p.final / v.servings)}/night
                    </span>
                    <span className="mt-2 block text-sm font-semibold leading-tight">
                      {showStrike && (
                        <span className="block text-[11px] font-normal text-[color:var(--color-muted)] line-through">
                          {formatPrice(p.base)}
                        </span>
                      )}
                      {formatPrice(p.final)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Purchase mode */}
          <fieldset className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-white">
            <label
              className={`flex cursor-pointer items-start gap-3 p-4 ${
                mode === 'subscribe' ? '' : 'opacity-70'
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === 'subscribe'}
                onChange={() => setMode('subscribe')}
                className="mt-1 accent-[color:var(--color-blue)]"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <strong className="text-sm">{subscribeLabel}</strong>
                  <span className="rounded-full bg-[color:var(--color-sand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-ink)]">
                    Save {Math.round(SUBSCRIBE_DISCOUNT * 100)}%
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-[color:var(--color-muted)]">
                  {subscribeNote}
                </span>
              </span>
            </label>
            <div className="border-t border-[color:var(--color-border)]" />
            <label
              className={`flex cursor-pointer items-start gap-3 p-4 ${
                mode === 'onetime' ? '' : 'opacity-70'
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === 'onetime'}
                onChange={() => setMode('onetime')}
                className="mt-1 accent-[color:var(--color-blue)]"
              />
              <span className="flex-1">
                <strong className="text-sm">{onetimeLabel}</strong>
                <span className="mt-0.5 block text-sm text-[color:var(--color-muted)]">
                  {onetimeNote}
                </span>
              </span>
            </label>
          </fieldset>

          {/* Add to cart */}
          <div className="mt-6 flex justify-center">
            {packSoldOut ? (
              <button
                type="button"
                disabled
                className="btn-blue px-8 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sold out
              </button>
            ) : (
              <AddToCartButton
                analytics={{type: 'hero-cta', packKey, mode}}
                lines={[
                  {
                    merchandiseId: variant.merchandiseId,
                    quantity: 1,
                    ...(sellingPlanId ? {sellingPlanId} : {}),
                  },
                ]}
                onClick={() => open('cart')}
                className="btn-blue px-8 text-base"
              >
                {ctaPrefix}{' '}
                {showStrike && (
                  <span className="ml-1 text-white/60 line-through">
                    {formatPrice(base)}
                  </span>
                )}{' '}
                {formatPrice(final)}
              </AddToCartButton>
            )}
          </div>

          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[color:var(--color-muted)]">
            <li className="flex items-center gap-1.5">
              <Check /> {badgeOne}
            </li>
            <li className="flex items-center gap-1.5">
              <Check /> {badgeTwo}
            </li>
          </ul>
        </div>
      </div>
      {children}
    </section>
  );
});

export default Hero;

function HeroVisual({images}: {images: HeroImage[]}) {
  // Split hero: video pane (placeholder for now) on the left, still on the right.
  // Uses the Shopify product images for both panes; the "video coming" overlay
  // makes it clear the left pane is where the real product video will land.
  const videoStill = images[0]?.url ?? (heroImage as unknown as string);
  const stillImage =
    images[1]?.url ?? images[0]?.url ?? (heroImage as unknown as string);
  const stillAlt =
    images[1]?.altText || images[0]?.altText || 'SleepFuel drink mix';

  return (
    <div className="absolute inset-y-0 right-0 left-0 overflow-hidden rounded-b-[1.75rem] lg:-left-16 lg:rounded-b-none lg:rounded-tr-[2.75rem] lg:rounded-br-[2.75rem]">
      <div className="grid h-full w-full grid-cols-2 gap-1">
        {/* Left: looped hero product video. */}
        <div className="relative h-full overflow-hidden">
          <video
            ref={autoplayVideo}
            src={heroVideo}
            poster={videoStill}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="SleepFuel drink mix pour"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Right: still image. */}
        <div className="relative h-full overflow-hidden">
          <img
            src={stillImage}
            alt={stillAlt}
            className="h-full w-full object-cover"
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HERO_QUERY = `#graphql
  query HeroProduct($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      images(first: 12) {
        nodes {
          id
          url
          altText
        }
      }
    }
  }
` as const;

/**
 * Supplies the product imagery and star-rating snippet when Weaverse renders
 * this section. The product route passes the same data as props instead.
 */
export const loader = async ({weaverse}: ComponentLoaderArgs) => {
  try {
    const {product} = await weaverse.storefront.query<{
      product?: {
        images: {nodes: Array<{url: string; altText: string | null}>};
      } | null;
    }>(HERO_QUERY, {variables: {handle: PRODUCT.handle}});

    return {
      heroImages: (product?.images?.nodes ?? [])
        .filter((node) => Boolean(node?.url))
        .map((node) => ({url: node.url, altText: node.altText ?? ''})),
      variantInfo: await fetchVariantData(weaverse.storefront),
    };
  } catch {
    return {
      heroImages: [],
      variantInfo: FALLBACK_VARIANT_INFO,
    };
  }
};

export const schema = createSchema({
  type: 'hero',
  title: 'Hero + buy box',
  settings: [
    {
      group: 'Content',
      inputs: [
        {type: 'text', name: 'heading', label: 'Product heading'},
        {type: 'textarea', name: 'tagline', label: 'Tagline'},
        {
          type: 'text',
          name: 'sizeLegend',
          label: 'Size selector label',
          defaultValue: 'Choose your size',
        },
        {
          type: 'text',
          name: 'ctaPrefix',
          label: 'Add-to-cart label',
          defaultValue: 'Add to Cart —',
        },
        {
          type: 'text',
          name: 'badgeOne',
          label: 'Trust badge 1',
          defaultValue: 'Free US shipping $50+',
        },
        {
          type: 'text',
          name: 'badgeTwo',
          label: 'Trust badge 2',
          defaultValue: 'Cancel anytime',
        },
      ],
    },
    {
      group: 'Purchase options',
      inputs: [
        {
          type: 'text',
          name: 'subscribeLabel',
          label: 'Subscribe option label',
          defaultValue: 'Subscribe & Save',
        },
        {
          type: 'text',
          name: 'subscribeNote',
          label: 'Subscribe option note',
          defaultValue: 'Delivered monthly. Cancel anytime.',
        },
        {
          type: 'text',
          name: 'onetimeLabel',
          label: 'One-time option label',
          defaultValue: 'One-time purchase',
        },
        {
          type: 'text',
          name: 'onetimeNote',
          label: 'One-time option note',
          defaultValue: 'No subscription. Pay full price.',
        },
      ],
    },
  ],
  presets: {
    sizeLegend: 'Choose your size',
    ctaPrefix: 'Add to Cart —',
    badgeOne: 'Free US shipping $50+',
    badgeTwo: 'Cancel anytime',
    subscribeLabel: 'Subscribe & Save',
    subscribeNote: 'Delivered monthly. Cancel anytime.',
    onetimeLabel: 'One-time purchase',
    onetimeNote: 'No subscription. Pay full price.',
  },
});
