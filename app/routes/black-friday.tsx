import {useEffect, useState} from 'react';
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/black-friday';
import {Analytics} from '@shopify/hydrogen';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {Stars, formatCount} from '~/components/Stars';
import reviewsData from '~/data/reviews.json';
import CompetitorSection from '~/sections/competitor';
import CompetitorRow from '~/sections/competitor-row';
import FormulaScience from '~/sections/formula-science';
import IngredientItem from '~/sections/ingredient-item';
import ReviewsSection from '~/sections/reviews';
import FAQSection from '~/sections/faq';
import FAQItem from '~/sections/faq-item';
import {autoplayVideo} from '~/lib/autoplayVideo';
import {INGREDIENTS} from '~/lib/sleepfuelIngredients';
import {COMPARISON_ROWS, FOOTNOTES} from '~/lib/gummyComparison';
import {PRODUCT, VARIANTS, formatPrice} from '~/lib/sleepfuelProduct';
import {fetchVariantData} from '~/lib/variantData';
import {
  SALE_END_LABEL,
  SALE_PACK,
  isSaleLive,
  saleCartLine,
  salePricing,
} from '~/lib/blackFriday';
import heroImage from '~/assets/hero.jpg';
import heroVideo from '~/assets/hero-video.mp4';

/**
 * /black-friday: the dedicated sale page the Black Friday ads link to.
 *
 * One offer, no choices: 30 nights on subscription, 60% off the first order
 * through a Shopify automatic discount (no code to type), renewing at the
 * normal 15% Subscribe & Save price. Leads with the gummy swap, the only ad
 * angle that has sold, then keeps the education and reviews from the
 * product page.
 *
 * Outside the sale window (see ~/lib/blackFriday) it redirects to the product
 * page. Add ?preview=1 to see it anyway.
 */

export const meta: Route.MetaFunction = () => [
  {title: 'Black Friday Sale: 60% Off SleepFuel | SleepFuel'},
  {
    name: 'description',
    content:
      'Black Friday: 60% off your first 30 nights of SleepFuel when you subscribe. About $1 a night. Zero sugar, 2 mg melatonin, 200 mg magnesium glycinate.',
  },
  {rel: 'canonical', href: '/black-friday'},
];

const HERO_IMAGES_QUERY = `#graphql
  query BlackFridayHeroImages($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      images(first: 4) {
        nodes {
          url
          altText
        }
      }
    }
  }
` as const;

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const preview = url.searchParams.has('preview');
  if (!preview && !isSaleLive()) {
    url.pathname = `/products/${PRODUCT.handle}`;
    return redirect(`${url.pathname}${url.search}`, 302);
  }

  let image: {url: string; altText: string} | null = null;
  try {
    const {product} = await context.storefront.query<{
      product?: {
        images: {nodes: Array<{url: string; altText: string | null}>};
      } | null;
    }>(HERO_IMAGES_QUERY, {variables: {handle: PRODUCT.handle}});
    const nodes = (product?.images?.nodes ?? []).filter((n) => n?.url);
    const pick = nodes[1] ?? nodes[0];
    if (pick) image = {url: pick.url, altText: pick.altText ?? ''};
  } catch {
    // Non critical: the hero falls back to its bundled image.
  }

  const variantInfo = await fetchVariantData(context.storefront);
  return {
    image,
    available: variantInfo[SALE_PACK].available,
    pricing: salePricing(variantInfo[SALE_PACK].price),
  };
}

type Pricing = ReturnType<typeof salePricing>;

export default function BlackFridayPage() {
  const {image, available, pricing} = useLoaderData<typeof loader>();

  return (
    <>
      <SaleBanner />
      <SaleHero image={image} available={available} pricing={pricing} />
      <OfferStrip pricing={pricing} />

      <CompetitorSection
        eyebrow="Drink mix vs gummies"
        heading="Your sleep gummies are basically candy."
        intro="Most melatonin gummies are sugar built around one ingredient, often at a high dose. Here’s how one SleepFuel stick compares."
        ourLabel="SleepFuel"
        theirLabel="Typical melatonin gummies"
      >
        {COMPARISON_ROWS.map((row) => (
          <CompetitorRow
            key={row.label}
            label={row.label}
            sleepfuel={row.sleepfuel}
            others={row.others}
          />
        ))}
      </CompetitorSection>
      <div className="mx-auto max-w-7xl px-5 pb-6 sm:px-6 lg:px-8">
        <ol className="max-w-3xl list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[color:var(--color-muted)]">
          {FOOTNOTES.map((note) => (
            <li key={note.href}>
              {note.text}{' '}
              <a
                href={note.href}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[color:var(--color-ink)]"
              >
                {note.source}
              </a>
            </li>
          ))}
        </ol>
      </div>

      <FormulaScience
        heading="Six ingredients. Zero sugar."
        headingAccent="Every dose on the label."
        videoLabel="Mixing SleepFuel into a glass"
      >
        {INGREDIENTS.map((ing) => (
          <IngredientItem
            key={ing.name}
            name={ing.name}
            dose={ing.dose}
            benefit={ing.benefit}
            icon={ing.icon}
          />
        ))}
      </FormulaScience>

      <ReviewsSection heading="What people are saying" />

      <FinalCta available={available} pricing={pricing} />

      <FAQSection heading="Sale questions">
        {saleFaqs(pricing).map((faq) => (
          <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
        ))}
      </FAQSection>

      <SaleStickyBar available={available} pricing={pricing} />

      <Analytics.ProductView
        data={{
          products: [
            {
              id: VARIANTS[SALE_PACK].merchandiseId,
              title: PRODUCT.title,
              price: String(pricing.first),
              vendor: 'SleepFuel',
              variantId: VARIANTS[SALE_PACK].merchandiseId,
              variantTitle: VARIANTS[SALE_PACK].label,
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

/* ============================================================
   Banner and hero
   ============================================================ */

function SaleBanner() {
  return (
    <div className="bg-[color:var(--color-blue)] px-5 py-3 text-center text-sm font-medium text-white sm:text-base">
      Black Friday Sale: 60% off your first 30 nights when you subscribe. Ends{' '}
      {SALE_END_LABEL}.
    </div>
  );
}

function SaleHero({
  image,
  available,
  pricing,
}: {
  image: {url: string; altText: string} | null;
  available: boolean;
  pricing: Pricing;
}) {
  const still = image?.url ?? (heroImage as unknown as string);

  return (
    <section className="grid items-stretch overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      <div className="relative min-h-[46vh] lg:min-h-[84vh]">
        <div className="absolute inset-0 overflow-hidden rounded-b-[1.75rem] lg:-left-16 lg:rounded-b-none lg:rounded-tr-[2.75rem] lg:rounded-br-[2.75rem]">
          <div className="grid h-full w-full grid-cols-2 gap-1">
            <video
              ref={autoplayVideo}
              src={heroVideo}
              poster={still}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="SleepFuel drink mix pour"
              className="h-full w-full object-cover"
            />
            <img
              src={still}
              alt={image?.altText || 'SleepFuel drink mix'}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
        <span className="absolute top-5 right-5 flex h-24 w-24 rotate-[-8deg] flex-col items-center justify-center rounded-full bg-[color:var(--color-blue)] text-center text-white shadow-lg lg:right-8">
          <span className="text-3xl font-semibold leading-none">60%</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
            off
          </span>
        </span>
      </div>

      <div className="flex items-center px-5 pt-10 pb-6 sm:px-8 sm:py-12 lg:px-14 lg:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-blue)]">
            Black Friday Sale · Ends {SALE_END_LABEL}
          </p>
          <h1 className="mt-3 text-[48px] font-normal leading-[1.05] tracking-tight sm:text-[64px]">
            Better sleep for {formatPrice(pricing.perNight)} a night.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[color:var(--color-muted)]">
            Swap the sugary gummy for one stick of mixed berry SleepFuel. 2 mg
            of melatonin, 200 mg of magnesium glycinate, zero sugar. Our
            biggest sale ever.
          </p>

          <a
            href="#reviews"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            <Stars rating={reviewsData.average} size={16} />
            <span className="font-medium text-[color:var(--color-ink)]">
              {reviewsData.average.toFixed(1)}
            </span>
            <span>({formatCount(reviewsData.total)} reviews)</span>
          </a>

          <OfferCard pricing={pricing} />

          <div className="mt-6 flex justify-center">
            <SaleButton
              available={available}
              pricing={pricing}
              analyticsType="bf-hero-cta"
              className="btn-blue w-full px-8 text-base"
            />
          </div>

          <RenewalNote pricing={pricing} className="mt-4 text-center" />
        </div>
      </div>
    </section>
  );
}

function OfferCard({pricing}: {pricing: Pricing}) {
  return (
    <div className="mt-8 rounded-2xl border-2 border-[color:var(--color-ink)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <strong className="text-base">
              {pricing.nights} Night Supply
            </strong>
            <span className="rounded-full bg-[color:var(--color-blue)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              60% off
            </span>
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Subscribe & Save · delivered every 4 weeks
          </p>
        </div>
        <div className="text-right">
          <span className="block text-sm text-[color:var(--color-muted)] line-through">
            {formatPrice(pricing.base)}
          </span>
          <span className="block text-2xl font-semibold leading-tight">
            {formatPrice(pricing.first)}
          </span>
          <span className="block text-xs text-[color:var(--color-muted)]">
            {formatPrice(pricing.perNight)}/night
          </span>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-[color:var(--color-border)] pt-4 text-sm">
        <li className="flex items-center gap-2">
          <Check /> Discount applied automatically at checkout
        </li>
        <li className="flex items-center gap-2">
          <Check /> Skip, pause or cancel anytime
        </li>
        <li className="flex items-center gap-2">
          <Check /> Zero sugar, zero calories
        </li>
      </ul>
    </div>
  );
}

/** Auto renewal terms, shown next to every add to cart button. */
function RenewalNote({
  pricing,
  className = '',
}: {
  pricing: Pricing;
  className?: string;
}) {
  return (
    <p
      className={`text-xs leading-relaxed text-[color:var(--color-muted)] ${className}`}
    >
      First 30 nights {formatPrice(pricing.first)}. Then{' '}
      {formatPrice(pricing.renewal)} every 4 weeks (15% off) until you cancel.
      Cancel anytime from your account.
    </p>
  );
}

function SaleButton({
  available,
  pricing,
  analyticsType,
  className,
  label,
}: {
  available: boolean;
  pricing: Pricing;
  analyticsType: string;
  className: string;
  label?: string;
}) {
  const {open} = useAside();

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        Sold out
      </button>
    );
  }

  return (
    <AddToCartButton
      analytics={{type: analyticsType, packKey: SALE_PACK, mode: 'subscribe'}}
      lines={[saleCartLine()]}
      onClick={() => open('cart')}
      className={className}
    >
      {label ?? (
        <>
          Claim 60% off:{' '}
          <span className="ml-1 text-white/60 line-through">
            {formatPrice(pricing.base)}
          </span>{' '}
          {formatPrice(pricing.first)}
        </>
      )}
    </AddToCartButton>
  );
}

/* ============================================================
   Offer strip, final CTA, sticky bar
   ============================================================ */

function OfferStrip({pricing}: {pricing: Pricing}) {
  const items = [
    {big: '60% off', small: 'your first 30 nights'},
    {big: `${formatPrice(pricing.perNight)}/night`, small: 'one stick before bed'},
    {big: '0 g sugar', small: 'unlike most sleep gummies'},
    {big: 'Cancel anytime', small: 'skip or pause in two clicks'},
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.big}
            className="rounded-2xl bg-[color:var(--color-sand-soft)] p-5 text-center"
          >
            <span className="block text-2xl font-semibold tracking-tight">
              {item.big}
            </span>
            <span className="mt-1 block text-sm text-[color:var(--color-muted)]">
              {item.small}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCta({available, pricing}: {available: boolean; pricing: Pricing}) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-[color:var(--color-midnight)] px-6 py-12 text-center text-white sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Black Friday · Ends {SALE_END_LABEL}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-[34px] font-normal leading-[1.1] tracking-tight text-white sm:text-[48px]">
          Put down the gummy. 60% off your first 30 nights.
        </h2>
        <div className="mx-auto mt-8 max-w-sm">
          <SaleButton
            available={available}
            pricing={pricing}
            analyticsType="bf-final-cta"
            className="btn-blue w-full px-8 text-base"
          />
          <p className="mt-4 text-xs leading-relaxed text-white/70">
            First 30 nights {formatPrice(pricing.first)}. Then{' '}
            {formatPrice(pricing.renewal)} every 4 weeks (15% off) until you
            cancel. Cancel anytime from your account.
          </p>
        </div>
      </div>
    </section>
  );
}

function SaleStickyBar({
  available,
  pricing,
}: {
  available: boolean;
  pricing: Pricing;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 700);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-3 sm:bottom-4 sm:pb-0"
      aria-hidden={!visible}
    >
      <div className="mx-auto w-full px-3 sm:max-w-3xl sm:px-4">
        <div
          className={`glass flex items-center justify-between gap-3 rounded-2xl border border-white/30 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 sm:rounded-full ${
            visible
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
          style={{
            backdropFilter: 'blur(22px) saturate(150%)',
            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
          }}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
              Black Friday: 60% off
            </div>
            <div className="truncate text-xs text-[color:var(--color-muted)]">
              30 nights ·{' '}
              <span className="line-through">{formatPrice(pricing.base)}</span>{' '}
              {formatPrice(pricing.first)} · then {formatPrice(pricing.renewal)}
              /4 wks
            </div>
          </div>
          <SaleButton
            available={available}
            pricing={pricing}
            analyticsType="bf-sticky-cta"
            className="btn-blue shrink-0 px-5 py-2.5 text-sm"
            label="Claim 60% off"
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FAQs
   ============================================================ */

function saleFaqs(pricing: Pricing): Array<{q: string; a: string}> {
  return [
    {
      q: 'How does the Black Friday deal work?',
      a: `Subscribe to the 30 night supply and your first order is 60% off: ${formatPrice(pricing.first)} instead of ${formatPrice(pricing.base)}. The discount is applied automatically at checkout, no code needed.`,
    },
    {
      q: 'What happens after my first order?',
      a: `Your subscription ships every 4 weeks at the regular Subscribe & Save price, ${formatPrice(pricing.renewal)} (15% off). You can skip, pause or cancel anytime from your account, including before your second order.`,
    },
    {
      q: 'When does the sale end?',
      a: `The sale runs through ${SALE_END_LABEL}. Order by then to lock in 60% off your first 30 nights.`,
    },
    {
      q: 'I already take melatonin gummies. Can I switch?',
      a: 'Yes. Stop the gummies and take one SleepFuel stick in 6 to 8 oz of water about 30 minutes before bed instead. Don’t take both on the same night. If you take prescription sleep medication, check with your doctor before changing your routine.',
    },
    {
      q: 'Will I feel groggy the next morning?',
      a: 'That’s the main reason we kept melatonin at 2 mg. It’s a low dose meant to support your natural wind down without the next day fog high dose melatonin is known for.',
    },
    {
      q: 'What does it taste like?',
      a: 'Mixed Berry. Lightly sweet with subtle lavender notes, sweetened with stevia. No sugar and no calories.',
    },
    {
      q: 'Is it a good gift?',
      a: 'It makes a great stocking stuffer. Orders placed by Dec 17 ship in time for Christmas.',
    },
    {
      q: 'Is it safe for kids or during pregnancy?',
      a: 'SleepFuel is formulated for adults 18 and over. If you’re pregnant, nursing, or taking medication, talk to your doctor before use. Keep it out of reach of children.',
    },
  ];
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
      className="shrink-0 text-[color:var(--color-blue)]"
    >
      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
