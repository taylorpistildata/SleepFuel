import {Suspense, useEffect} from 'react';
import {Await, Link} from 'react-router';
import {
  CartForm,
  Image,
  Money,
  useOptimisticCart,
  type OptimisticCart,
} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {useCheckoutStartedPublisher} from '~/components/OpenAiAdsPixel';
import {isSaleLive} from '~/lib/blackFriday';
import {
  FREE_SHIPPING_THRESHOLD,
  MERCHANDISE_TO_SELLING_PLAN,
  formatPrice,
} from '~/lib/sleepfuelProduct';

type DrawerCart = OptimisticCart<CartApiQueryFragment | null>;
type DrawerLine = NonNullable<DrawerCart>['lines']['nodes'][number];

/**
 * Seed-style cart: a rounded white card that floats inset from the screen
 * edges over a dark scrim, sliding in from the right. Holds a free-shipping
 * progress bar, a "switch to Subscribe & Save" upsell, the line items, and a
 * pinned checkout footer.
 */
export function CartDrawer({
  cart,
}: {
  cart: Promise<CartApiQueryFragment | null>;
}) {
  const {type, close} = useAside();
  const open = type === 'cart';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div
      className={`sf-cart-overlay ${open ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Your cart"
    >
      <button className="sf-cart-scrim" aria-label="Close cart" onClick={close} />
      <div className="sf-cart-panel">
        <Suspense fallback={<DrawerFrame onClose={close} count={null} />}>
          <Await resolve={cart}>
            {(resolved) => <CartDrawerBody cart={resolved} onClose={close} />}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function CartDrawerBody({
  cart: original,
  onClose,
}: {
  cart: CartApiQueryFragment | null;
  onClose: () => void;
}) {
  const cart = useOptimisticCart(original);
  const publishCheckoutStarted = useCheckoutStartedPublisher(cart);
  const lines = (cart?.lines?.nodes ?? []) as DrawerLine[];
  const count = cart?.totalQuantity ?? 0;
  const hasItems = count > 0;
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const hasSubscription = lines.some(
    (line) => line.sellingPlanAllocation?.sellingPlan?.id,
  );

  return (
    <DrawerFrame onClose={onClose} count={count}>
      {hasItems ? (
        <>
          <FreeShippingBar
            subtotal={subtotal}
            saleFreeShipping={hasSubscription && isSaleLive()}
          />
          <div className="flex-1 overflow-y-auto px-5">
            <ul className="divide-y divide-[color:var(--color-border)]">
              {lines.map((line) => (
                <DrawerLineItem key={line.id} line={line} onClose={onClose} />
              ))}
            </ul>
          </div>
          <div className="border-t border-[color:var(--color-border)] px-5 pb-5 pt-4">
            {!hasSubscription && <SubscribeUpsell lines={lines} />}
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-[color:var(--color-muted)]">
                Subtotal
              </span>
              <span className="text-lg font-semibold text-[color:var(--color-ink)]">
                {cart?.cost?.subtotalAmount ? (
                  <Money data={cart.cost.subtotalAmount} />
                ) : (
                  formatPrice(subtotal)
                )}
              </span>
            </div>
            <p className="mb-3 text-xs text-[color:var(--color-muted)]">
              Shipping &amp; taxes calculated at checkout.
            </p>
            {cart?.checkoutUrl && (
              <a
                href={cart.checkoutUrl}
                onClick={publishCheckoutStarted}
                className="btn-blue w-full text-base"
              >
                Continue to Checkout
              </a>
            )}
          </div>
        </>
      ) : (
        <EmptyCart onClose={onClose} />
      )}
    </DrawerFrame>
  );
}

/** Shared chrome: header bar + content slot. Used for loading + populated states. */
function DrawerFrame({
  onClose,
  count,
  children,
}: {
  onClose: () => void;
  count: number | null;
  children?: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">
          Your Cart
          {count ? (
            <span className="ml-1.5 text-[color:var(--color-muted)]">
              ({count})
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-ink)] hover:bg-[color:var(--color-neutral)]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      {children ?? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--color-muted)]">
          Loading cart…
        </div>
      )}
    </>
  );
}

/**
 * During the Black Friday sale, subscription orders ship free at any total
 * (Shopify automatic free shipping discount for subscriptions), so the bar shows unlocked.
 */
function FreeShippingBar({
  subtotal,
  saleFreeShipping = false,
}: {
  subtotal: number;
  saleFreeShipping?: boolean;
}) {
  const unlocked = saleFreeShipping || subtotal >= FREE_SHIPPING_THRESHOLD;
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const pct = unlocked
    ? 100
    : Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  return (
    <div className="px-5 pb-1 pt-4">
      <p className="mb-2 text-center text-sm text-[color:var(--color-ink)]">
        {unlocked ? (
          <>
            <span aria-hidden="true">🎉 </span>You&rsquo;ve unlocked{' '}
            <strong>free shipping!</strong>
          </>
        ) : (
          <>
            You&rsquo;re{' '}
            <strong>{formatPrice(remaining)}</strong> away from free shipping
          </>
        )}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-sand)]">
        <div
          className="h-full rounded-full bg-[color:var(--color-blue)] transition-[width] duration-500 ease-out"
          style={{width: `${pct}%`}}
        />
      </div>
    </div>
  );
}

function SubscribeUpsell({lines}: {lines: DrawerLine[]}) {
  const updates = lines
    .filter((line) => !line.sellingPlanAllocation?.sellingPlan?.id)
    .map((line) => {
      const sellingPlanId =
        MERCHANDISE_TO_SELLING_PLAN[line.merchandise.id];
      if (!sellingPlanId) return null;
      return {
        id: line.id,
        merchandiseId: line.merchandise.id,
        quantity: line.quantity,
        sellingPlanId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (updates.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-[color:var(--color-blue)]/30 bg-[color:var(--color-sand-soft)] p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{background: 'var(--color-blue)'}}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 8a6 6 0 019.6-4.8M14 8a6 6 0 01-9.6 4.8" strokeLinecap="round" />
            <path d="M11.5 1.5v2h-2M4.5 14.5v-2h2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            Subscribe &amp; Save 15%
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            Switch to a monthly delivery for an extra 15% off — plus free
            shipping. Cancel anytime.
          </p>
        </div>
      </div>
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesUpdate}
        inputs={{lines: updates}}
      >
        {(fetcher) => (
          <button
            type="submit"
            disabled={fetcher.state !== 'idle'}
            className="btn-blue mt-3 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fetcher.state !== 'idle'
              ? 'Switching…'
              : 'Switch to Subscribe & Save'}
          </button>
        )}
      </CartForm>
    </div>
  );
}

function DrawerLineItem({
  line,
  onClose,
}: {
  line: DrawerLine;
  onClose: () => void;
}) {
  const {merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const isSubscription = Boolean(line.sellingPlanAllocation?.sellingPlan?.id);
  const optionText = (selectedOptions ?? [])
    .filter((o) => o.value && o.value !== 'Default Title')
    .map((o) => o.value)
    .join(' · ');

  return (
    <li className="flex gap-3 py-4">
      <Link
        to={`/products/${product.handle}`}
        onClick={onClose}
        className="shrink-0"
      >
        {image ? (
          <Image
            data={image}
            alt={title}
            aspectRatio="1/1"
            height={72}
            width={72}
            className="h-18 w-18 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="h-18 w-18 rounded-xl"
            style={{
              background:
                'radial-gradient(115% 100% at 30% 25%, #3a4a6e 0%, #232a3f 60%, #14161f 100%)',
            }}
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${product.handle}`}
            onClick={onClose}
            className="text-sm font-semibold text-[color:var(--color-ink)]"
          >
            {product.title}
          </Link>
          <RemoveLineButton lineId={line.id} />
        </div>
        {optionText && (
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            {optionText}
          </p>
        )}
        {isSubscription && (
          <span className="mt-1 inline-block rounded-full bg-[color:var(--color-sand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-ink)]">
            Subscribe &amp; Save
          </span>
        )}
        <div className="mt-2 flex items-center justify-between">
          <QuantityStepper line={line} />
          <span className="text-sm font-semibold text-[color:var(--color-ink)]">
            {line.cost?.totalAmount ? (
              <Money data={line.cost.totalAmount} />
            ) : null}
          </span>
        </div>
      </div>
    </li>
  );
}

function QuantityStepper({line}: {line: DrawerLine}) {
  const {id, quantity, isOptimistic} = line;
  const prev = Math.max(1, quantity - 1);
  const next = quantity + 1;

  return (
    <div className="inline-flex items-center rounded-full border border-[color:var(--color-border)]">
      <QtyButton
        lineId={id}
        quantity={prev}
        disabled={quantity <= 1 || !!isOptimistic}
        label="Decrease quantity"
      >
        &minus;
      </QtyButton>
      <span className="min-w-6 text-center text-sm tabular-nums">
        {quantity}
      </span>
      <QtyButton
        lineId={id}
        quantity={next}
        disabled={!!isOptimistic}
        label="Increase quantity"
      >
        +
      </QtyButton>
    </div>
  );
}

function QtyButton({
  lineId,
  quantity,
  disabled,
  label,
  children,
}: {
  lineId: string;
  quantity: number;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines: [{id: lineId, quantity}]}}
    >
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center text-base leading-none text-[color:var(--color-ink)] disabled:opacity-30"
      >
        {children}
      </button>
    </CartForm>
  );
}

function RemoveLineButton({lineId}: {lineId: string}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds: [lineId]}}
    >
      <button
        type="submit"
        aria-label="Remove item"
        className="shrink-0 text-xs text-[color:var(--color-muted)] underline hover:text-[color:var(--color-ink)]"
      >
        Remove
      </button>
    </CartForm>
  );
}

function EmptyCart({onClose}: {onClose: () => void}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{background: 'var(--color-neutral)'}}
        aria-hidden="true"
      >
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="var(--color-ink)" strokeWidth="1.5">
          <path d="M3 5h2l2 9h9l2-7H6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="17" r="1" />
          <circle cx="15" cy="17" r="1" />
        </svg>
      </div>
      <p className="text-sm text-[color:var(--color-muted)]">
        Your cart is empty.
      </p>
      <Link
        to="/products/sleepfuel-drink-mix"
        onClick={onClose}
        className="btn-blue text-sm"
      >
        Shop SleepFuel
      </Link>
    </div>
  );
}
