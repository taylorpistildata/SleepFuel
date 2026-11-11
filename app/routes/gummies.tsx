import {useLoaderData} from 'react-router';
import type {Route} from './+types/gummies';
import {Analytics} from '@shopify/hydrogen';
import Hero from '~/sections/hero';
import type {HeroImage} from '~/sections/hero';
import FeatureCallouts from '~/sections/feature-callouts';
import FeatureCalloutItem from '~/sections/feature-callout-item';
import CompetitorSection from '~/sections/competitor';
import CompetitorRow from '~/sections/competitor-row';
import FormulaScience from '~/sections/formula-science';
import IngredientItem from '~/sections/ingredient-item';
import ReviewsSection from '~/sections/reviews';
import FAQSection from '~/sections/faq';
import FAQItem from '~/sections/faq-item';
import {StickyAddToCart} from '~/components/StickyAddToCart';
import {usePurchaseState} from '~/lib/purchaseState';
import {INGREDIENTS} from '~/lib/sleepfuelIngredients';
import {PRODUCT, VARIANTS, priceFrom} from '~/lib/sleepfuelProduct';
import {fetchVariantData} from '~/lib/variantData';
import featureCounterImage from '~/assets/feature-counter.jpg';
import featureBerriesImage from '~/assets/feature-berries.jpg';
import featureWakeImage from '~/assets/feature-wake.jpg';

/**
 * /gummies: ad landing page comparing SleepFuel drink mix with melatonin
 * gummies, the angle that performs best in paid social.
 *
 * Built from the product page's sections so pricing, add to cart, Subscribe
 * & Save, reviews and the pixels (ViewContent, AddToCart) behave exactly as
 * they do on /products/sleepfuel-drink-mix.
 *
 * Every claim about gummies is either general ("often", "usually") or
 * sourced in the footnotes below the table. Name no brands here.
 */

export const meta: Route.MetaFunction = () => [
  {title: 'SleepFuel vs Melatonin Gummies | SleepFuel'},
  {
    name: 'description',
    content:
      'Why a 2 mg melatonin drink mix with magnesium, L-theanine and GABA beats a high dose melatonin gummy. Zero sugar, every dose on the label.',
  },
  {rel: 'canonical', href: '/gummies'},
];

const HERO_IMAGES_QUERY = `#graphql
  query GummiesHeroImages($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      images(first: 12) {
        nodes {
          url
          altText
        }
      }
    }
  }
` as const;

export async function loader({context}: Route.LoaderArgs) {
  let heroImages: HeroImage[] = [];
  try {
    const {product} = await context.storefront.query<{
      product?: {
        images: {nodes: Array<{url: string; altText: string | null}>};
      } | null;
    }>(HERO_IMAGES_QUERY, {variables: {handle: PRODUCT.handle}});
    heroImages = (product?.images?.nodes ?? [])
      .filter((node) => Boolean(node?.url))
      .map((node) => ({url: node.url, altText: node.altText ?? ''}));
  } catch {
    // Non critical: the hero falls back to its bundled image.
  }

  return {heroImages, variantInfo: await fetchVariantData(context.storefront)};
}

export default function GummiesPage() {
  const {heroImages, variantInfo} = useLoaderData<typeof loader>();
  const {packKey, mode} = usePurchaseState();

  return (
    <>
      <Hero
        heroImages={heroImages}
        variantInfo={variantInfo}
        heading="Put down the gummy."
        tagline="A 2 mg melatonin drink mix with magnesium, L-theanine and GABA. Zero sugar, every dose on the label, and no morning fog."
        sizeLegend="Choose your size"
        ctaPrefix="Add to Cart —"
        badgeOne="Free US shipping $50+"
        badgeTwo="Cancel anytime"
        subscribeLabel="Subscribe & Save"
        subscribeNote="Delivered monthly. Cancel anytime."
        onetimeLabel="One-time purchase"
        onetimeNote="No subscription. Pay full price."
      />

      <CompetitorSection
        eyebrow="Drink mix vs gummies"
        heading="Why we didn’t make a gummy."
        intro="Most melatonin gummies are candy built around one ingredient, often at a high dose. Here’s how a SleepFuel stick compares."
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

      <FeatureCallouts>
        {REASONS.map((reason) => (
          <FeatureCalloutItem
            key={reason.title}
            eyebrow={reason.eyebrow}
            title={reason.title}
            copy={reason.copy}
            image={reason.image}
            alt={reason.alt}
          />
        ))}
      </FeatureCallouts>

      <FormulaScience
        heading="Everything a gummy leaves out."
        headingAccent="Nothing hidden."
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

      <FAQSection heading="Switching from gummies">
        {FAQS.map((faq) => (
          <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
        ))}
      </FAQSection>

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

/* ============================================================
   Comparison: claims about gummies stay general or are sourced
   ============================================================ */

const COMPARISON_ROWS: Array<{
  label: string;
  sleepfuel: string;
  others: string;
}> = [
  {label: 'Melatonin per serving', sleepfuel: '2 mg', others: 'Often 3 to 10 mg'},
  {
    label: 'Dose you actually get',
    sleepfuel: 'Every dose listed on the label',
    others: '74% to 347% of the label in lab tests¹',
  },
  {label: 'Magnesium glycinate', sleepfuel: '200 mg', others: 'Rarely included'},
  {
    label: 'L-theanine, GABA, lemon balm',
    sleepfuel: 'All three',
    others: 'Usually melatonin alone',
  },
  {label: 'Sugar', sleepfuel: '0 g', others: 'Usually added sugar'},
  {label: 'Calories', sleepfuel: '0', others: 'Usually some'},
  {label: 'Looks like candy to kids', sleepfuel: 'No', others: 'Yes²'},
  {label: 'Form', sleepfuel: 'Stick mixed into a drink', others: 'Chewed like candy'},
];

const FOOTNOTES = [
  {
    text: 'In a lab analysis of 25 melatonin gummy products sold in the US, measured melatonin ranged from 74% to 347% of the labeled amount, and one product contained none.',
    source: 'Cohen et al., JAMA, 2023',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10130950/',
  },
  {
    text: 'Pediatric melatonin ingestions reported to US poison centers rose 530% from 2012 to 2021.',
    source: 'CDC MMWR, 2022',
    href: 'https://www.cdc.gov/mmwr/volumes/71/wr/mm7122a1.htm',
  },
];

/* ============================================================
   Three reasons, reusing the product page photography
   ============================================================ */

const REASONS = [
  {
    eyebrow: 'Less melatonin',
    title: 'More isn’t better',
    copy: 'Research suggests doses close to what your body makes are enough to support sleep onset. We use 2 mg, not 10, so you wake up clear instead of foggy.',
    image: featureWakeImage as unknown as string,
    alt: 'A woman waking up rested in lavender pajamas beside a glass of water',
  },
  {
    eyebrow: 'Room for what works',
    title: 'A stick fits a full formula',
    copy: 'A gummy only holds a few grams, so most carry melatonin and not much else. A stick holds 200 mg of magnesium glycinate plus L-theanine, GABA, inositol and lemon balm.',
    image: featureCounterImage as unknown as string,
    alt: 'SleepFuel mixed berry drink mix sticks on a marble counter',
  },
  {
    eyebrow: 'A ritual, not candy',
    title: 'Something to look forward to',
    copy: 'Mixed berry, zero sugar, zero calories. Stir one stick into warm or cold water 30 minutes before bed and make it part of winding down.',
    image: featureBerriesImage as unknown as string,
    alt: 'A SleepFuel drink mix stick resting on a bowl of fresh mixed berries',
  },
];

/* ============================================================
   FAQs for people coming from gummies
   ============================================================ */

const FAQS: Array<{q: string; a: string}> = [
  {
    q: 'I already take melatonin gummies. Can I switch?',
    a: 'Yes. Stop the gummies and take one SleepFuel stick in 6 to 8 oz of water about 30 minutes before bed instead. Don’t take both on the same night. If you take prescription sleep medication, check with your doctor before changing your routine.',
  },
  {
    q: 'Is 2 mg of melatonin enough if I’m used to 5 or 10?',
    a: 'Research suggests lower doses closer to what your body produces are effective for supporting sleep onset, and high doses are where most next day grogginess comes from. SleepFuel also relies on magnesium glycinate, L-theanine and GABA to help you wind down, so melatonin isn’t doing all the work.',
  },
  {
    q: 'Why a drink instead of a gummy?',
    a: 'A gummy is mostly sugar and gelatin with room for very little else. A stick pack holds full doses of five calming actives plus melatonin, with no sugar, and mixing it into a drink makes it a bedtime ritual rather than a piece of candy.',
  },
  {
    q: 'Will I feel groggy the next morning?',
    a: 'That’s the main reason we kept melatonin at 2 mg. It’s a low, physiologic dose meant to support your natural wind down without the next day fog high dose melatonin is known for.',
  },
  {
    q: 'What does it taste like?',
    a: 'Mixed Berry. Lightly sweet with subtle lavender notes, sweetened with stevia. No sugar and no calories.',
  },
  {
    q: 'How does Subscribe & Save work?',
    a: 'Subscribe & Save gets you 15% off every order, shipped monthly. Skip, pause, or cancel anytime from your account page in about two clicks.',
  },
  {
    q: 'Is it safe for kids or during pregnancy?',
    a: 'SleepFuel is formulated for adults 18 and over. If you’re pregnant, nursing, or taking medication, talk to your doctor before use. Keep it out of reach of children.',
  },
];
