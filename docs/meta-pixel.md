# Meta (Facebook / Instagram) pixel

Pixel ID `1146974057753403`. Built alongside the OpenAI Ads pixel
(`docs/openai-ads-pixel.md`), which is separate and unaffected.

## Who sends what

| Event | Sent by |
| --- | --- |
| PageView, ViewContent, AddToCart | This storefront (`<MetaPixel/>`) |
| InitiateCheckout, AddPaymentInfo, Purchase, checkout steps | Shopify checkout (checkout.drinksleepfuel.com) |

InitiateCheckout, AddPaymentInfo and Purchase are deliberately **not** sent
from the storefront. Shopify checkout already reports them, and sending them
here too would double count conversions that ads optimise against.

## How it is wired

| Concern | Where |
| --- | --- |
| fbq stub, init, fbevents.js, consent, Hydrogen subscriptions | `app/components/MetaPixel.tsx` |
| Payload mapping, pixel id, host gating (pure, unit tested) | `app/lib/metaPixel.ts`, `app/lib/metaPixel.test.ts` |
| Mounted inside `Analytics.Provider` | `app/root.tsx` |
| CSP allow list | `app/entry.server.tsx` (`metaPixelCsp`) |

- **One component, one init.** Nothing about Meta is in the document head.
  `<MetaPixel/>` defines the fbq queue, calls `init` and adds fbevents.js on
  the client, guarded by a window flag, so client side navigation and React
  remounts never init twice or add a second SDK tag.
- **Consent** comes from Shopify's Customer Privacy API through Hydrogen's
  consent setup (`consent` on `Analytics.Provider`). Hydrogen withholds all
  events until the privacy API has loaded and analytics is allowed. The pixel
  is only loaded once marketing is allowed, starting with `consent grant`;
  if a visitor later opts out it gets `consent revoke`, and `grant` again if
  they opt back in. A visitor who never allows marketing never loads
  fbevents.js.
- **PageView** on first load and every client side route change, from
  Hydrogen's `page_viewed`.
- **ViewContent** once per visit to the product page, from
  `<Analytics.ProductView>` in `app/routes/products.$handle.tsx` (the
  advertorial page is custom, so the view is published explicitly). Changing
  pack size or purchase mode does not send another one.
- **AddToCart** from Hydrogen's `product_added_to_cart`, published after every
  successful cart change that adds units: every add to cart button on the page
  (hero and sticky bar, all through `AddToCartButton`) and the cart drawer's
  quantity plus. Switching a line to Subscribe & Save in the drawer is not
  counted as an add.
- **content_ids** are numeric Shopify variant ids. Values are decimals at the
  price actually charged (Subscribe & Save is 15% off list), for the units
  added in that action. Currency is USD.
- **eventID** is unique per event (`<Event>.<uuid>`), passed as
  `fbq('track', name, params, {eventID})`.
- **Hosts.** Loads on drinksleepfuel.com, www.drinksleepfuel.com and Oxygen
  preview hosts (`*.myshopify.dev`), so previews can be checked before
  release. Preview traffic does reach the pixel; filter it in Events Manager
  if needed. Local dev never loads it.

## Verifying

1. Open the page with the **Meta Pixel Helper** extension, or Events Manager >
   Test Events.
2. Load `/products/sleepfuel-drink-mix`: one PageView and one ViewContent for
   1146974057753403.
3. Each add to cart button, and the plus in the cart drawer: one AddToCart
   with the variant id and value.
4. Navigate client side to another page: one PageView.
5. Opt out of marketing (`window.Shopify.customerPrivacy.setTrackingConsent`
   with marketing false): `consent revoke`, then no further events.
