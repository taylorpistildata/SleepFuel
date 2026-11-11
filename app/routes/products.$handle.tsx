import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {Analytics} from '@shopify/hydrogen';
import Hero from '~/sections/hero';
import type {HeroImage, ReviewSnippet} from '~/sections/hero';
import FeatureCallouts from '~/sections/feature-callouts';
import FeatureCalloutItem from '~/sections/feature-callout-item';
import FormulaScience from '~/sections/formula-science';
import IngredientItem from '~/sections/ingredient-item';
import FAQSection from '~/sections/faq';
import FAQItem from '~/sections/faq-item';
import MocktailsSection from '~/sections/mocktails';
import MocktailCard from '~/sections/mocktail-card';
import CompetitorSection from '~/sections/competitor';
import CompetitorRow from '~/sections/competitor-row';
import UgcSection from '~/sections/ugc';
import UgcCard, {type UgcTone} from '~/sections/ugc-card';
import ReviewsSection from '~/sections/reviews';
import {StickyAddToCart} from '~/components/StickyAddToCart';
import {usePurchaseState} from '~/lib/purchaseState';
import featureCounterImage from '~/assets/feature-counter.jpg';
import featureBerriesImage from '~/assets/feature-berries.jpg';
import featureWakeImage from '~/assets/feature-wake.jpg';
import mocktailChamomileImage from '~/assets/mocktail-chamomile.jpg';
import mocktailCherryImage from '~/assets/mocktail-cherry.jpg';
import mocktailLatteImage from '~/assets/mocktail-latte.jpg';
import {PRODUCT, VARIANTS, priceFrom} from '~/lib/sleepfuelProduct';
import {INGREDIENTS} from '~/lib/sleepfuelIngredients';
import {
  FALLBACK_VARIANT_INFO,
  fetchVariantData,
  type VariantInfoMap,
} from '~/lib/variantData';
import {WeaverseContent} from '~/weaverse';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'SleepFuel Drink Mix — Mixed Berry Sleep Supplement'},
    {name: 'description', content: PRODUCT.tagline},
    {rel: 'canonical', href: `/products/${PRODUCT.handle}`},
  ];
};

export type {HeroImage, ReviewSnippet} from '~/sections/hero';

const PRODUCT_PAGE_QUERY = `#graphql
  query ProductPage($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
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

export async function loader({context, params}: Route.LoaderArgs) {
  let heroImages: HeroImage[] = [];

  try {
    const {product} = await context.storefront.query<{
      product?: {
        images: {nodes: Array<{url: string; altText: string | null}>};
      } | null;
    }>(PRODUCT_PAGE_QUERY, {variables: {handle: PRODUCT.handle}});

    heroImages = (product?.images?.nodes ?? [])
      .filter((node) => Boolean(node?.url))
      .map((node) => ({url: node.url, altText: node.altText ?? ''}));
  } catch {
    // Product data is non-critical — fall back to bundled hero + no reviews.
    heroImages = [];
  }

  // Studio owns this page's content. If Weaverse is unreachable we keep the
  // code-rendered sections below rather than serving a blank product page —
  // this is the storefront's only revenue page.
  const weaverseData = context.weaverse
    ? await context.weaverse
        .loadPage({type: 'PRODUCT', handle: params.handle ?? PRODUCT.handle})
        .catch(() => null)
    : null;

  return {
    heroImages,
    weaverseData,
    variantInfo: await fetchVariantData(context.storefront),
  };
}

/**
 * True when Weaverse returned real published content. `loadPage` resolves a
 * synthetic "fallback" page when a handle has nothing published, which would
 * otherwise render an empty document.
 */
function hasWeaversePage(data: {page?: {id?: string}} | null): boolean {
  const id = data?.page?.id;
  return Boolean(id) && !String(id).includes('fallback');
}

export default function ProductPage() {
  const {heroImages, weaverseData, variantInfo} =
    useLoaderData<typeof loader>();
  const {packKey, mode} = usePurchaseState();

  return (
    <>
      {hasWeaversePage(weaverseData) ? (
        <WeaverseContent />
      ) : (
        <CodeRenderedSections
          heroImages={heroImages}
          variantInfo={variantInfo}
        />
      )}

      <StickyAddToCart
        image={heroImages[1] ?? heroImages[0] ?? null}
        packKey={packKey}
        mode={mode}
        variantInfo={variantInfo}
      />

      <Analytics.ProductView
        data={{
          products: [
            {
              id: VARIANTS[packKey].merchandiseId,
              title: PRODUCT.title,
              price: String(priceFrom(variantInfo[packKey].price, mode).final),
              vendor: 'SleepFuel',
              variantId: VARIANTS[packKey].merchandiseId,
              variantTitle: VARIANTS[packKey].label,
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

/**
 * The pre-Weaverse section tree, kept as a fallback for when Studio content
 * cannot be loaded. Content here and in Studio can drift; Studio is the
 * source of truth whenever it responds.
 */
function CodeRenderedSections({
  heroImages,
  variantInfo = FALLBACK_VARIANT_INFO,
}: {
  heroImages: HeroImage[];
  variantInfo?: VariantInfoMap;
}) {
  return (
    <>
      <Hero
        heroImages={heroImages}
        variantInfo={variantInfo}
        heading={PRODUCT.title}
        tagline={PRODUCT.tagline}
        sizeLegend="Choose your size"
        ctaPrefix="Add to Cart —"
        badgeOne="Free US shipping $50+"
        badgeTwo="Cancel anytime"
        subscribeLabel="Subscribe & Save"
        subscribeNote="Delivered monthly. Cancel anytime."
        onetimeLabel="One-time purchase"
        onetimeNote="No subscription. Pay full price."
      />
      <FeatureCallouts>
        {FEATURES.map((f) => (
          <FeatureCalloutItem
            key={f.title}
            eyebrow={f.eyebrow}
            title={f.title}
            copy={f.copy}
            image={f.image}
            alt={f.alt}
          />
        ))}
      </FeatureCallouts>
      <CompetitorSection
        eyebrow="The competition"
        heading="How SleepFuel stacks up."
        intro="A quick, honest look at how our formula compares to the field of popular sleep drinks."
        ourLabel="SleepFuel"
        theirLabel="Others"
      >
        {COMPETITOR_ROWS.map((row) => (
          <CompetitorRow
            key={row.label}
            label={row.label}
            sleepfuel={row.sleepfuel}
            others={row.others}
          />
        ))}
      </CompetitorSection>
      <FormulaScience
        heading="Synergistic Ingredients."
        headingAccent="Better Sleep."
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
      <UgcSection
        eyebrow="From the community"
        heading="Better sleepers, real routines."
      >
        {UGC_CARDS.map((c) => (
          <UgcCard key={c.handle} handle={c.handle} tone={c.tone} />
        ))}
      </UgcSection>
      <ReviewsSection heading="What people are saying" />
      <FAQSection heading="Frequently asked questions">
        {FAQS.map((faq) => (
          <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
        ))}
      </FAQSection>
      <MocktailsSection
        eyebrow="Sleep Mocktails"
        heading="Turn your SleepFuel into a wind-down ritual."
        intro="Three easy sleep-friendly mocktails. Each starts with one stick of SleepFuel and takes under two minutes."
      >
        {MOCKTAILS.map((r) => (
          <MocktailCard
            key={r.name}
            name={r.name}
            description={r.description}
            href={r.href}
            image={r.image}
            imageAlt={r.imageAlt}
          />
        ))}
      </MocktailsSection>
    </>
  );
}

/* ============================================================
   3 feature callouts with images
   ============================================================ */

/* ============================================================
   3 feature callouts with images
   ============================================================ */

/**
 * Card content for `<FeatureCallouts>`. Lives here until the Weaverse Studio
 * project owns this section's content; the section itself is already
 * schema-driven and editable.
 */
const FEATURES = [
  {
    eyebrow: 'Engineered in every way',
    title: 'Deep sleep, by design',
    copy: 'Six evidence-backed actives — magnesium glycinate, L-theanine, GABA, inositol, lemon balm, and a micro-dose of melatonin.',
    image: featureCounterImage as unknown as string,
    alt: 'SleepFuel mixed berry drink mix sticks on a marble counter',
  },
  {
    eyebrow: 'Mixed berry like you’ve never tasted',
    title: 'Actually delicious',
    copy: 'No chalky aftertaste, no sugar crash. One stick into cold or warm water and you’re set for the night.',
    image: featureBerriesImage as unknown as string,
    alt: 'A SleepFuel drink mix stick resting on a bowl of fresh mixed berries',
  },
  {
    eyebrow: 'Made for you and all you do',
    title: 'Wake up clear',
    copy: 'Deeper, more restorative sleep with no morning grogginess and no melatonin hangover.',
    image: featureWakeImage as unknown as string,
    alt: 'A woman waking up rested in lavender pajamas beside a glass of water',
  },
];

/* ============================================================
   Ingredient science lives in app/lib/sleepfuelIngredients.ts
   ============================================================ */

/* ============================================================
   6 expandable FAQs (inline, Oura accordion style)
   ============================================================ */

const FAQS: Array<{q: string; a: string}> = [
  {
    q: 'Will I feel groggy the next morning?',
    a: 'This is the number one fear with anything sleep-related, and it’s why we use 2mg of melatonin instead of the 5–10mg you’ll find in most sleep aids. That’s a low, physiologic dose, enough to support your natural wind-down without the next-day fog high-dose melatonin is known for. The rest of the formula, magnesium glycinate and L-theanine, works with your body’s own relaxation pathways, not against them.',
  },
  {
    q: 'Is SleepFuel habit-forming?',
    a: 'No. There’s nothing in SleepFuel that creates dependency. It’s a blend of minerals, amino acids, and botanicals that support your body’s natural sleep process, not a sedative. You can use it nightly or just when you need it, and stop anytime.',
  },
  {
    q: 'Why only 2mg of melatonin? Other brands have 10mg.',
    a: 'Because more isn’t better. Research suggests lower doses closer to what your body produces naturally are effective for supporting sleep onset. High doses are where grogginess and vivid-dream complaints come from. We dosed for how you feel at 7am, not for a bigger number on the label.',
  },
  {
    q: 'How fast does it work, and when should I take it?',
    a: 'Mix one stick pack into 6–8 oz of water about 30 minutes before bed. Most people feel the wind-down effect the first night. The magnesium benefits build with consistent use, so it gets better over the first couple of weeks.',
  },
  {
    q: 'What does it taste like?',
    a: 'Mixed Berry. Lightly sweet, with subtle lavender notes and no sugar, sweetened with stevia. It’s designed to be a ritual you actually look forward to, not something you choke down.',
  },
  {
    q: 'What’s in it, and why those ingredients?',
    a: 'Five actives, each at a deliberate dose: magnesium glycinate (200mg) for relaxation and muscle ease, L-theanine (200mg) to quiet a racing mind, GABA (200mg) and lemon balm (100mg) to support calm, and 2mg of melatonin to cue sleep onset. Full amounts are on the label. No proprietary blends, no hidden doses.',
  },
  {
    q: 'Can I take it every night?',
    a: 'Yes, SleepFuel is formulated for nightly use. All ingredients are within established daily-use ranges, including the 200mg of magnesium, which sits comfortably under the supplemental daily limit.',
  },
  {
    q: 'Can I take SleepFuel with other supplements or medications?',
    a: 'If you take prescription medications, especially sedatives, blood pressure medication, or antidepressants, check with your doctor first. Same if you already take a magnesium supplement, so you don’t double up.',
  },
  {
    q: 'Is it safe during pregnancy or for kids?',
    a: 'SleepFuel is formulated for adults 18 and over. If you’re pregnant or nursing, talk to your doctor before use.',
  },
  {
    q: 'Does it have sugar, calories, or anything artificial?',
    a: 'No sugar (it’s sweetened with stevia) and zero calories per serving. It’s vegan, and colored with vegetable extract, not artificial dyes.',
  },
  {
    q: 'Where is it made, and can I trust what’s in it?',
    a: 'SleepFuel is made in the USA in a GMPC Certified Facility. Every active and its exact dose is printed on the label. No proprietary blends, nothing hidden. What you read is what’s in the stick pack.',
  },
  {
    q: 'How does the subscription work? Can I cancel?',
    a: 'Subscribe & Save gets you 15% off every order, shipped monthly. Skip, pause, or cancel anytime from your account page in about two clicks. No emails, no phone calls, no retention scripts.',
  },
  {
    q: 'How fast is shipping?',
    a: 'Orders ship within 1–2 business days from Texas. Free shipping on every subscription order.',
  },
];

/* ============================================================
   Customer reviews — rendered from app/data/reviews.json
   (see app/sections/reviews.tsx).
   ============================================================ */

/* ============================================================
   Sleep Mocktails — 3 recipes built around one SleepFuel stick
   ============================================================ */

type Mocktail = {
  name: string;
  description: string;
  href: string; // empty until the recipe post exists on the blog
  image?: string;
  imageAlt?: string;
};

const MOCKTAILS: Mocktail[] = [
  {
    name: 'Tart Cherry Sleep Cooler',
    description:
      'A crisp berry-forward sipper — tart cherry juice is nature’s melatonin, doubled up with SleepFuel.',
    href: '',
    image: mocktailCherryImage,
    imageAlt: 'A calming SleepFuel berry smoothie in a glass',
  },
  {
    name: 'Chamomile Moon Sipper',
    description:
      'Herbal and warm on the palate, cool in the glass — for the nights that ask you to slow down.',
    href: '',
    image: mocktailChamomileImage,
    imageAlt:
      'A SleepFuel chamomile mocktail splashing in a glass with fresh berries',
  },
  {
    name: 'Golden Slumber Latte',
    description:
      'A creamy, warm-spiced wind-down. Serve gently warm on cold nights or over ice when it’s mild.',
    href: '',
    image: mocktailLatteImage,
    imageAlt:
      'A tall glass of iced SleepFuel mocktail with strawberries, blackberries, and eucalyptus',
  },
];

/* ============================================================
   Competitor comparison — public facts only, dashes where unclear
   ============================================================ */

type CompetitorRow = {
  label: string;
  sleepfuel: string;
  others: string;
};

const COMPETITOR_ROWS: CompetitorRow[] = [
  {label: 'Magnesium', sleepfuel: '200 mg', others: '< 200 mg'},
  {
    label: 'Melatonin',
    sleepfuel: '2 mg · micro-dose',
    others: '> 3 mg · large dose',
  },
  {label: 'L-Theanine', sleepfuel: '200 mg', others: '< 200 mg'},
  {label: 'GABA', sleepfuel: '200 mg', others: '< 200 mg'},
  {label: 'Lemon balm', sleepfuel: '100 mg', others: 'Not included'},
  {label: 'Sugar free', sleepfuel: 'Yes', others: 'No'},
  {label: 'Tastes great', sleepfuel: 'Always', others: 'No'},
  {label: 'No next-day grogginess', sleepfuel: 'Never', others: 'Always'},
  {label: 'Cost per night', sleepfuel: '~$2', others: '> $3'},
];

/* ============================================================
   UGC vertical-video carousel — placeholder cards for now
   ============================================================ */

const UGC_CARDS: Array<{handle: string; tone: UgcTone}> = [
  {handle: '@sleeplover', tone: 'midnight'},
  {handle: '@midnightmuse', tone: 'plum'},
  {handle: '@wellnessritual', tone: 'olive'},
  {handle: '@nightowl.co', tone: 'sand'},
  {handle: '@shutteye_official', tone: 'rose'},
];
