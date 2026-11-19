import {VARIANTS, priceFrom, sellingPlanFor} from '~/lib/sleepfuelProduct';

/**
 * Black Friday / Cyber Monday 2026 sale, shown on /blackfriday26.
 *
 * The discount itself is a Shopify AUTOMATIC discount (no code): 60% off the
 * first order of the 30 night pack on subscription. Renewals fall back to the
 * normal Subscribe & Save selling plan (15% off). This file only describes
 * the offer for the page; Shopify decides what checkout charges, so keep
 * these numbers in step with the discount in the admin.
 */

/** 60% off the first subscription order. */
export const SALE_DISCOUNT = 0.6;

/** The only option on the sale page: 30 nights, subscribe. */
export const SALE_PACK = 'pack30' as const;

/**
 * Sale window, Central time. The page shows sale pricing only inside it and
 * otherwise redirects to the product page, so it can never advertise 60% off
 * when the automatic discount isn't running. Match these to the discount's
 * start and end in Shopify. Add ?preview=1 to view the page outside the window.
 */
export const SALE_START = new Date('2026-11-20T00:00:00-06:00');
export const SALE_END = new Date('2026-12-02T00:00:00-06:00'); // through Dec 1

export const SALE_END_LABEL = 'Dec 1';

export function isSaleLive(now: Date = new Date()) {
  return now >= SALE_START && now < SALE_END;
}

/**
 * Prices for the sale offer from the live one time price of the 30 night pack.
 * Rounds to cents the way a Shopify percentage discount does.
 */
export function salePricing(base: number) {
  const first = Math.round(base * (1 - SALE_DISCOUNT) * 100) / 100;
  const renewal = Math.round(priceFrom(base, 'subscribe').final * 100) / 100;
  const nights = VARIANTS[SALE_PACK].servings;
  return {
    base,
    first,
    perNight: first / nights,
    renewal,
    nights,
  };
}

/** Cart line for the sale offer: 30 night pack with the subscription plan. */
export function saleCartLine() {
  const sellingPlanId = sellingPlanFor(SALE_PACK);
  return {
    merchandiseId: VARIANTS[SALE_PACK].merchandiseId,
    quantity: 1,
    ...(sellingPlanId ? {sellingPlanId} : {}),
  };
}
