import {VARIANTS, priceFrom, sellingPlanFor} from '~/lib/sleepfuelProduct';

/**
 * Black Friday / Cyber Monday 2026 sale, shown on /blackfriday26.
 *
 * The discount itself is a Shopify AUTOMATIC discount (no code): 60% off the
 * first order of the 30 night pack on subscription. Renewals fall back to the
 * normal Subscribe & Save selling plan (15% off). Shipping on subscription
 * orders is free during the sale through a second Shopify automatic discount
 * (free shipping, subscriptions only, same dates). This file only describes
 * the offer for the page; Shopify decides what checkout charges, so keep
 * these numbers in step with the discount in the admin.
 */

/** URL of the sale page. */
export const SALE_PATH = '/blackfriday26';

/** 60% off the first subscription order. */
export const SALE_DISCOUNT = 0.6;

/** The main offer on the sale page: 30 nights, subscribe. */
export const SALE_PACK = 'pack30' as const;

/**
 * Sale window, Central time. The page shows sale pricing only inside it and
 * otherwise redirects to the product page, so it can never advertise 60% off
 * when the automatic discount isn't running. Match these to the discount's
 * start and end in Shopify. Add ?preview=1 to view the page outside the window.
 */
export const SALE_START = new Date('2026-11-19T00:00:00-06:00'); // discount already running
export const SALE_END = new Date('2026-12-02T00:00:00-06:00'); // through Dec 1

export const SALE_END_LABEL = 'Dec 1';

export function isSaleLive(now: Date = new Date()) {
  return now >= SALE_START && now < SALE_END;
}

/**
 * Prices for the sale offer from the live one time price of the 30 night pack.
 *
 * Shopify applies the 60% automatic discount on top of the 15% Subscribe &
 * Save price, so the first order is 60% off the subscription price
 * ($63.74 to $25.50 at $74.99 base). Verified against a live cart on
 * 2026-11-19. Rounds to cents the way a Shopify percentage discount does.
 */
export function salePricing(base: number) {
  const renewal = Math.round(priceFrom(base, 'subscribe').final * 100) / 100;
  const first = Math.round(renewal * (1 - SALE_DISCOUNT) * 100) / 100;
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

/**
 * Most units of the sale item (30 night subscription) one cart can hold
 * while the sale is live. Enforced in the /cart action and the cart UIs.
 */
export const SALE_MAX_QTY = 1;

type CartLineLike = {
  id?: string;
  quantity?: number;
  merchandise?: {id?: string | null} | null;
  sellingPlanAllocation?: {sellingPlan?: {id?: string | null} | null} | null;
};

/** True for a cart line that is the sale item: 30 night pack on subscription. */
export function isSaleLine(line: CartLineLike | null | undefined) {
  return (
    !!line &&
    line.merchandise?.id === VARIANTS[SALE_PACK].merchandiseId &&
    !!line.sellingPlanAllocation?.sellingPlan?.id
  );
}

/** Quantity limit applies only while the sale is live. */
export function isSaleQtyLimited(line: CartLineLike | null | undefined) {
  return isSaleLive() && isSaleLine(line);
}

/**
 * Secondary "Or buy once" option: 10 nights, one time, at the regular price.
 * Not discounted and not capped; normal shipping rules apply.
 */
export const BUY_ONCE_PACK = 'pack10' as const;

export function buyOnceCartLine() {
  return {merchandiseId: VARIANTS[BUY_ONCE_PACK].merchandiseId, quantity: 1};
}
