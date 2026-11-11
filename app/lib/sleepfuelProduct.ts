/**
 * SleepFuel product data — linked to the live Shopify products.
 *
 * Each "tier" is a separate Shopify product (a quantity/night-supply variant).
 * `merchandiseId` holds the real Storefront API ProductVariant GID, so
 * one-time add-to-cart works end-to-end.
 *
 * Subscribe & Save: each product has a recurring "Subscribe and save" selling
 * plan (15% off) configured in the Shopify admin, wired up in
 * `SELLING_PLAN_IDS`. Subscribe mode attaches the plan so the discount is
 * honored at checkout (see `sellingPlanFor`).
 */

export const SUBSCRIBE_DISCOUNT = 0.15; // 15% off when subscribed

/** Order subtotal (USD) required to unlock free shipping. */
export const FREE_SHIPPING_THRESHOLD = 49;

export type PackKey = 'pack10' | 'pack20' | 'pack30';
export type PurchaseMode = 'subscribe' | 'onetime';

export type Variant = {
  key: PackKey;
  label: string; // "10 Night Supply"
  servings: number; // nights
  basePrice: number; // one-time price, in dollars
  /** Real Storefront API ProductVariant GID */
  merchandiseId: string;
};

export const VARIANTS: Record<PackKey, Variant> = {
  pack10: {
    key: 'pack10',
    label: '10 Night Supply',
    servings: 10,
    basePrice: 29.99,
    merchandiseId: 'gid://shopify/ProductVariant/44790724296790',
  },
  pack20: {
    key: 'pack20',
    label: '20 Night Supply',
    servings: 20,
    basePrice: 55.99,
    merchandiseId: 'gid://shopify/ProductVariant/44790725345366',
  },
  pack30: {
    key: 'pack30',
    label: '30 Night Supply',
    servings: 30,
    basePrice: 85.99,
    merchandiseId: 'gid://shopify/ProductVariant/44790725443670',
  },
};

/** Order of the tiers as shown in the selector. */
export const PACK_ORDER: PackKey[] = ['pack10', 'pack20', 'pack30'];

/**
 * Tier to highlight with a "Best value" badge (lowest cost per night).
 *
 * At Shopify's current prices the 30-night is $2.12/night against the
 * 20-night's $2.34, so the badge belongs on pack30. Re-check this if the
 * per-pack pricing changes.
 */
export const BEST_VALUE_KEY: PackKey = 'pack30';

/** Tier selected when the page first loads. */
export const DEFAULT_PACK_KEY: PackKey = 'pack30';

/**
 * Shopify Subscriptions selling plan GIDs — one per product. Empty until the
 * selling plans are created in the Shopify admin. Fill in like:
 *   pack10: 'gid://shopify/SellingPlan/123456789',
 */
export const SELLING_PLAN_IDS: Record<PackKey, string> = {
  pack10: 'gid://shopify/SellingPlan/2664038486',
  pack20: 'gid://shopify/SellingPlan/2664071254',
  pack30: 'gid://shopify/SellingPlan/2663972950',
};

/** Returns the selling plan GID for a tier, or undefined if not configured. */
export function sellingPlanFor(key: PackKey): string | undefined {
  const id = SELLING_PLAN_IDS[key];
  return id.startsWith('gid://shopify/SellingPlan/') ? id : undefined;
}

/**
 * Reverse lookup from a variant's merchandise GID to its monthly selling plan,
 * used by the cart drawer's "switch to Subscribe & Save" upsell. Only includes
 * tiers that actually have a configured selling plan.
 */
export const MERCHANDISE_TO_SELLING_PLAN: Record<string, string> =
  Object.fromEntries(
    PACK_ORDER.map((k) => [VARIANTS[k].merchandiseId, sellingPlanFor(k)] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

export function priceFor(key: PackKey, mode: PurchaseMode) {
  return priceFrom(VARIANTS[key].basePrice, mode);
}

/**
 * Applies the subscribe discount to a base price. Prefer this with a live
 * Shopify price (see `fetchVariantData`) so the page can't advertise a figure
 * the checkout won't honour; `priceFor` is the bundled-constant fallback.
 *
 * SUBSCRIBE_DISCOUNT is verified to match the Shopify selling plans, which are
 * all "Deliver every 4 weeks, 15% off".
 */
export function priceFrom(base: number, mode: PurchaseMode) {
  const final = mode === 'subscribe' ? base * (1 - SUBSCRIBE_DISCOUNT) : base;
  return {base, final};
}

export function pricePerNight(key: PackKey, mode: PurchaseMode) {
  return priceFor(key, mode).final / VARIANTS[key].servings;
}

export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

export const PRODUCT = {
  /** Real Storefront/Admin Product GID for the 10-Night listing. */
  id: 'gid://shopify/Product/7885621461078',
  handle: 'sleepfuel-drink-mix',
  title: 'SleepFuel Drink Mix',
  tagline:
    'Mixed berry sleep supplement, powered by Magnesium, L-theanine and Melatonin.',
  longDescription:
    'A doctor-formulated nightly drink mix that quiets a busy mind, eases you into deep sleep, and helps you wake up clear-headed. Mixed berry flavor, no sugar crash, no morning grogginess.',
  ingredients: [
    {
      name: 'Magnesium Glycinate',
      dose: '200mg',
      benefit: 'Relaxes muscles and the nervous system',
    },
    {
      name: 'L-Theanine',
      dose: '200mg',
      benefit: 'Calms an overactive mind without sedation',
    },
    {
      name: 'GABA',
      dose: '200mg',
      benefit: 'The brain’s primary calming neurotransmitter',
    },
    {
      name: 'Inositol',
      dose: '200mg',
      benefit: 'Supports a balanced mood for easier rest',
    },
    {
      name: 'Lemon Balm Extract',
      dose: '100mg',
      benefit: 'A time-honored calming herb',
    },
    {
      name: 'Melatonin',
      dose: '2mg',
      benefit: 'A micro-dose to gently cue your body clock',
    },
  ],
  benefits: [
    {
      title: 'Fall asleep faster',
      copy: 'Calm the nighttime mental chatter in 30 minutes or less.',
    },
    {
      title: 'Stay asleep longer',
      copy: 'Spend more time in deep, restorative sleep cycles.',
    },
    {
      title: 'Wake up clear',
      copy: 'No grogginess, no melatonin hangover.',
    },
  ],
} as const;
