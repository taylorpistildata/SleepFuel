import {useEffect, useState} from 'react';
import {
  FALLBACK_VARIANT_INFO,
  type VariantInfoMap,
} from '~/lib/variantData';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {
  DEFAULT_PACK_KEY,
  VARIANTS,
  formatPrice,
  priceFrom,
  sellingPlanFor,
  type PackKey,
  type PurchaseMode,
} from '~/lib/sleepfuelProduct';

type Props = {
  /** Product shot for the thumbnail — the same image the hero renders. */
  image?: {url: string; altText?: string} | null;
  packKey?: PackKey;
  mode?: PurchaseMode;
  variantInfo?: VariantInfoMap;
};

/**
 * Oura-style sticky add-to-cart bar: a frosted, slightly transparent
 * rounded bar pinned to the bottom. Product thumbnail + name + variant on
 * the left; price + blue Add to Cart button on the right. Defaults to the
 * 30-pack subscribe-and-save. Reveals after the hero scrolls
 * out of view.
 */
export function StickyAddToCart({
  image = null,
  packKey = DEFAULT_PACK_KEY,
  mode = 'subscribe',
  variantInfo = FALLBACK_VARIANT_INFO,
}: Props) {
  const [visible, setVisible] = useState(false);
  const {open} = useAside();

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const variant = VARIANTS[packKey];
  const {base, final} = priceFrom(variantInfo[packKey].price, mode);
  const sellingPlanId =
    mode === 'subscribe' ? sellingPlanFor(packKey) : undefined;
  const showStrike = mode === 'subscribe';
  const soldOut = !variantInfo[packKey].available;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-3 sm:bottom-4 sm:pb-0"
      aria-hidden={!visible}
    >
      <div className="mx-auto w-full px-3 sm:max-w-3xl sm:px-4">
        {/* Reveal animation lives on the .glass element itself — never on an
            ancestor — so the backdrop-filter keeps sampling the page behind it. */}
        <div
          className={`glass flex items-center justify-between gap-3 rounded-2xl border border-white/30 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 sm:rounded-full sm:px-4 ${
            visible
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'translate-y-6 opacity-0'
          }`}
          style={{
            backdropFilter: 'blur(22px) saturate(150%)',
            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
          }}
        >
          {/* Left: thumbnail + name */}
          <div className="flex min-w-0 items-center gap-3">
            {/* Falls back to the original gradient block when no product
                image is available, so the bar never renders a broken thumb. */}
            {image?.url ? (
              <img
                src={thumbnailUrl(image.url)}
                alt=""
                className="hidden h-12 w-12 shrink-0 rounded-xl object-cover sm:block"
                loading="lazy"
                aria-hidden="true"
              />
            ) : (
              <div
                className="hidden h-12 w-12 shrink-0 rounded-xl sm:block"
                style={{
                  background:
                    'radial-gradient(120% 100% at 30% 25%, #3a4a6e 0%, #232a3f 60%, #14161f 100%)',
                }}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
                {PRODUCT_NAME}
              </div>
              <div className="truncate text-xs text-[color:var(--color-muted)]">
                {variant.label} ·{' '}
                {mode === 'subscribe' ? 'Subscribe & Save' : 'One-time'}
              </div>
            </div>
          </div>

          {/* Right: price + CTA */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right text-sm font-semibold text-[color:var(--color-ink)]">
              {showStrike && (
                <span className="mr-1 font-normal text-[color:var(--color-muted)] line-through">
                  {formatPrice(base)}
                </span>
              )}
              {formatPrice(final)}
            </div>
            {soldOut ? (
              <button
                type="button"
                disabled
                className="btn-blue px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sold out
              </button>
            ) : (
              <AddToCartButton
                analytics={{type: 'sticky-cta', packKey, mode}}
                lines={[
                  {
                    merchandiseId: variant.merchandiseId,
                    quantity: 1,
                    ...(sellingPlanId ? {sellingPlanId} : {}),
                  },
                ]}
                onClick={() => open('cart')}
                className="btn-blue px-5 py-2.5 text-sm"
              >
                Add to Cart
              </AddToCartButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PRODUCT_NAME = 'SleepFuel Drink Mix';

/**
 * Asks the Shopify CDN for a thumbnail-sized copy. The product shots are
 * 1024x1024, and this renders at 48px — without a width param the bar pulls
 * the full-size original for a thumbnail. 96px covers 2x displays.
 *
 * Non-Shopify URLs are returned untouched.
 */
function thumbnailUrl(url: string): string {
  if (!url.includes('cdn.shopify.com')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}width=96`;
}
