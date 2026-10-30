/**
 * Mapping helpers for the Meta (Facebook / Instagram) pixel.
 *
 * Pure and browser-agnostic so it can be unit tested without a DOM. The
 * component that talks to `fbq` lives in `app/components/MetaPixel.tsx`.
 *
 * Meta wants decimal currency values (`value: 25.49`), not the integer minor
 * units the OpenAI pixel uses, so amounts are converted here rather than
 * reusing that pixel's payloads. Ids and quantities share its helpers so both
 * pixels describe the same products the same way.
 *
 * Only standard event parameters are sent. The dataset is in a Meta
 * "core setup" category, which strips custom parameters and anything after
 * the domain in URLs, so sending more would only be discarded.
 */

import {toQuantity, variantContentId} from '~/lib/openAiPixel';

/** Meta pixel (dataset) the storefront reports to. */
export const META_PIXEL_ID = '1146974057753403';
export const META_SDK_URL = 'https://connect.facebook.net/en_US/fbevents.js';

/**
 * Hosts allowed to load the pixel: production plus Oxygen preview
 * deployments (`*.myshopify.dev`), so a preview can be verified with Meta
 * Pixel Helper and Test Events before it ships. Local dev, the raw
 * myshopify.com domain and any other host never load it.
 */
export const META_PIXEL_HOSTS: ReadonlySet<string> = new Set([
  'drinksleepfuel.com',
  'www.drinksleepfuel.com',
]);

/** Oxygen preview and branch deployments are served from this suffix. */
export const OXYGEN_PREVIEW_HOST_SUFFIX = '.myshopify.dev';

export function isMetaPixelHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return META_PIXEL_HOSTS.has(host) || host.endsWith(OXYGEN_PREVIEW_HOST_SUFFIX);
}

/**
 * Unique id for one fbq event, passed as `{eventID}` so Meta can dedupe it
 * against the same event reported server side.
 */
export function createMetaEventId(
  event: string,
  random: () => string = defaultRandomId,
): string {
  return `${event}.${random()}`;
}

function defaultRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through.
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Path of a URL (absolute or relative), or null if it cannot be parsed. */
export function urlPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url, 'https://drinksleepfuel.com').pathname;
  } catch {
    return null;
  }
}

export type MetaContent = {id: string; quantity: number; item_price?: number};

/** Standard parameters for ViewContent / AddToCart. */
export type MetaEventParams = {
  content_ids: string[];
  content_type: 'product';
  contents: MetaContent[];
  content_name?: string;
  value?: number;
  currency?: string;
};

export type MetaStorefrontEvent = 'PageView' | 'ViewContent' | 'AddToCart';

type ShopLike = {currency?: string | null} | null;
type MoneyLike = {amount?: string | null; currencyCode?: string | null} | null;

/** Structural cart line, so Hydrogen type changes can't alter the payload. */
type CartLineLike = {
  id?: string | null;
  quantity?: number | null;
  cost?: {amountPerQuantity?: MoneyLike} | null;
  merchandise?: {
    id?: string | null;
    title?: string | null;
    price?: MoneyLike;
    product?: {title?: string | null} | null;
  } | null;
} | null;

type CartLike = {
  lines?:
    | {
        nodes?: CartLineLike[] | null;
        edges?: Array<{node: CartLineLike}> | null;
      }
    | null;
} | null;

function cartLines(cart: CartLike | undefined | null): CartLineLike[] {
  const lines = cart?.lines;
  if (!lines) return [];
  if (Array.isArray(lines.nodes)) return lines.nodes;
  if (Array.isArray(lines.edges)) return lines.edges.map((edge) => edge.node);
  return [];
}

/**
 * Quantity the shopper already had when Hydrogen reports a brand new line.
 *
 * Switching a line to Subscribe & Save in the cart drawer can replace the line
 * (new line id, same variant). Hydrogen then reports the new line as "added",
 * which is not a real add to cart. If the previous cart held the same variant
 * on a line that no longer exists, that quantity was already in the cart.
 */
function replacedLineQuantity(
  payload: {
    currentLine?: CartLineLike;
    cart?: CartLike;
    prevCart?: CartLike;
  } | null,
): number {
  const variant = payload?.currentLine?.merchandise?.id;
  if (!variant) return 0;
  const currentIds = new Set(cartLines(payload?.cart).map((line) => line?.id));
  return cartLines(payload?.prevCart)
    .filter(
      (line) =>
        line?.merchandise?.id === variant && !currentIds.has(line?.id),
    )
    .reduce((sum, line) => sum + toQuantity(line?.quantity), 0);
}

/** Decimal amount, or null when the input is not a usable number. */
export function toDecimal(
  amount: string | number | null | undefined,
): number | null {
  if (amount === null || amount === undefined || amount === '') return null;
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return null;
  // Round to cents so float noise (29.990000000000002) never reaches Meta.
  return Math.round(value * 100) / 100;
}

function resolveCurrency(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return 'USD';
}

function contentName(
  productTitle?: string | null,
  variantTitle?: string | null,
): string | undefined {
  const parts = [productTitle, variantTitle].filter(
    (part): part is string => Boolean(part) && part !== 'Default Title',
  );
  return parts.length ? parts.join(' - ') : undefined;
}

/** `ViewContent` from Hydrogen's PRODUCT_VIEWED payload. */
export function mapMetaViewContent(
  payload: {
    products?: Array<{
      title?: string | null;
      price?: string | number | null;
      variantId?: string | null;
      variantTitle?: string | null;
      quantity?: number | null;
    }> | null;
    shop?: ShopLike;
  } | null,
): MetaEventParams | null {
  const product = (payload?.products ?? []).find((item) =>
    variantContentId(item?.variantId),
  );
  const id = variantContentId(product?.variantId);
  if (!product || !id) return null;

  const price = toDecimal(product.price);
  const name = contentName(product.title, product.variantTitle);

  return {
    content_ids: [id],
    content_type: 'product',
    contents: [
      {
        id,
        quantity: toQuantity(product.quantity),
        ...(price === null ? {} : {item_price: price}),
      },
    ],
    ...(name ? {content_name: name} : {}),
    ...(price === null
      ? {}
      : {value: price, currency: resolveCurrency(payload?.shop?.currency)}),
  };
}

/**
 * `AddToCart` — only what this action added, valued at what the shopper is
 * charged.
 *
 * Same two rules as the OpenAI pixel, for the same reasons: the unit price is
 * `cost.amountPerQuantity` (Subscribe & Save is 15% below list price), and the
 * quantity is the delta against `prevLine`, because Hydrogen reports the line
 * after the update.
 */
export function mapMetaAddToCart(
  payload: {
    prevLine?: CartLineLike;
    currentLine?: CartLineLike;
    cart?: CartLike;
    prevCart?: CartLike;
    shop?: ShopLike;
  } | null,
): MetaEventParams | null {
  const line = payload?.currentLine;
  const id = variantContentId(line?.merchandise?.id);
  if (!id) return null;

  const current = toQuantity(line?.quantity);
  const previous = payload?.prevLine
    ? toQuantity(payload.prevLine.quantity)
    : replacedLineQuantity(payload);
  if (current - previous <= 0) return null;
  const added = current - previous;

  const paid = line?.cost?.amountPerQuantity;
  const list = line?.merchandise?.price;
  const unitPrice = toDecimal(paid?.amount) ?? toDecimal(list?.amount);
  const currency = resolveCurrency(
    paid?.currencyCode,
    list?.currencyCode,
    payload?.shop?.currency,
  );
  const name = contentName(
    line?.merchandise?.product?.title,
    line?.merchandise?.title,
  );
  const value = unitPrice === null ? null : toDecimal(unitPrice * added);

  return {
    content_ids: [id],
    content_type: 'product',
    contents: [
      {
        id,
        quantity: added,
        ...(unitPrice === null ? {} : {item_price: unitPrice}),
      },
    ],
    ...(name ? {content_name: name} : {}),
    ...(value === null ? {} : {value, currency}),
  };
}
