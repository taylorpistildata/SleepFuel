import {describe, expect, it} from 'vitest';
import {
  META_PIXEL_ID,
  createMetaEventId,
  isMetaPixelHost,
  mapMetaAddToCart,
  urlPath,
  mapMetaViewContent,
  toDecimal,
} from './metaPixel';

const VARIANT = 'gid://shopify/ProductVariant/4455667788';

describe('pixel id', () => {
  it('reports to pixel 1146974057753403', () => {
    expect(META_PIXEL_ID).toBe('1146974057753403');
  });
});

describe('host gating', () => {
  it('allows the production storefront and Oxygen previews', () => {
    expect(isMetaPixelHost('drinksleepfuel.com')).toBe(true);
    expect(isMetaPixelHost('www.drinksleepfuel.com')).toBe(true);
    expect(isMetaPixelHost('DrinkSleepFuel.com')).toBe(true);
    expect(isMetaPixelHost('01m4e7faf-abc.o2.myshopify.dev')).toBe(true);
  });

  it('excludes staging, local dev and other hosts', () => {
    expect(isMetaPixelHost('myshopify.dev')).toBe(false);
    expect(isMetaPixelHost('b70c18.myshopify.com')).toBe(false);
    expect(isMetaPixelHost('localhost')).toBe(false);
    expect(isMetaPixelHost('staging.drinksleepfuel.com')).toBe(false);
    expect(isMetaPixelHost('sleepfuel.co')).toBe(false);
    expect(isMetaPixelHost('')).toBe(false);
    expect(isMetaPixelHost(undefined)).toBe(false);
  });
});

describe('toDecimal', () => {
  it('keeps decimal currency values, rounded to cents', () => {
    expect(toDecimal('29.99')).toBe(29.99);
    expect(toDecimal(25.49 * 3)).toBe(76.47);
    expect(toDecimal('7')).toBe(7);
  });

  it('returns null for unusable input', () => {
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal('')).toBeNull();
    expect(toDecimal('n/a')).toBeNull();
  });
});

describe('ViewContent', () => {
  it('maps a product view to standard parameters', () => {
    expect(
      mapMetaViewContent({
        products: [
          {
            title: 'SleepFuel Drink Mix',
            variantTitle: '30 Night Supply',
            price: '74.99',
            variantId: VARIANT,
            quantity: 1,
          },
        ],
        shop: {currency: 'USD'},
      }),
    ).toEqual({
      content_ids: ['4455667788'],
      content_type: 'product',
      contents: [{id: '4455667788', quantity: 1, item_price: 74.99}],
      content_name: 'SleepFuel Drink Mix - 30 Night Supply',
      value: 74.99,
      currency: 'USD',
    });
  });

  it('omits value when the price is unknown', () => {
    const params = mapMetaViewContent({
      products: [{title: 'SleepFuel', variantId: VARIANT, price: null}],
    });
    expect(params).not.toHaveProperty('value');
    expect(params).not.toHaveProperty('currency');
    expect(params?.content_ids).toEqual(['4455667788']);
  });

  it('returns null without a usable product', () => {
    expect(mapMetaViewContent({products: []})).toBeNull();
    expect(mapMetaViewContent({products: [{title: 'x'}]})).toBeNull();
    expect(mapMetaViewContent(null)).toBeNull();
  });
});

describe('AddToCart', () => {
  const line = (quantity: number, amount = '25.49') => ({
    quantity,
    cost: {amountPerQuantity: {amount, currencyCode: 'USD'}},
    merchandise: {
      id: VARIANT,
      title: '10 Night Supply',
      price: {amount: '29.99', currencyCode: 'USD'},
      product: {title: 'SleepFuel Drink Mix'},
    },
  });

  it('values a new line at the price actually charged', () => {
    // Subscribe & Save: 25.49 charged against a 29.99 list price.
    expect(mapMetaAddToCart({currentLine: line(1)})).toEqual({
      content_ids: ['4455667788'],
      content_type: 'product',
      contents: [{id: '4455667788', quantity: 1, item_price: 25.49}],
      content_name: 'SleepFuel Drink Mix - 10 Night Supply',
      value: 25.49,
      currency: 'USD',
    });
  });

  it('reports only the units added, not the resulting line', () => {
    const params = mapMetaAddToCart({prevLine: line(2), currentLine: line(3)});
    expect(params?.contents[0].quantity).toBe(1);
    expect(params?.value).toBe(25.49);
  });

  it('multiplies value by units added', () => {
    const params = mapMetaAddToCart({prevLine: line(1), currentLine: line(4)});
    expect(params?.contents[0].quantity).toBe(3);
    expect(params?.value).toBe(76.47);
  });

  it('falls back to the list price when the charged price is missing', () => {
    const params = mapMetaAddToCart({
      currentLine: {...line(1), cost: null},
    });
    expect(params?.value).toBe(29.99);
  });

  it('returns null without a variant', () => {
    expect(mapMetaAddToCart({currentLine: null})).toBeNull();
    expect(mapMetaAddToCart(null)).toBeNull();
  });

  it('ignores a line replaced by a Subscribe & Save switch', () => {
    const before = {...line(2, '29.99'), id: 'gid://shopify/CartLine/a'};
    const after = {...line(2), id: 'gid://shopify/CartLine/b'};
    expect(
      mapMetaAddToCart({
        currentLine: after,
        cart: {lines: {nodes: [after]}},
        prevCart: {lines: {nodes: [before]}},
      }),
    ).toBeNull();
  });

  it('counts only extra units when a replaced line also grew', () => {
    const before = {...line(1), id: 'gid://shopify/CartLine/a'};
    const after = {...line(3), id: 'gid://shopify/CartLine/b'};
    const params = mapMetaAddToCart({
      currentLine: after,
      cart: {lines: {nodes: [after]}},
      prevCart: {lines: {nodes: [before]}},
    });
    expect(params?.contents[0].quantity).toBe(2);
  });

  it('still reports a new variant added next to an existing line', () => {
    const existing = {
      ...line(1),
      id: 'gid://shopify/CartLine/a',
      merchandise: {...line(1).merchandise, id: 'gid://shopify/ProductVariant/1'},
    };
    const added = {...line(1), id: 'gid://shopify/CartLine/b'};
    const params = mapMetaAddToCart({
      currentLine: added,
      cart: {lines: {nodes: [existing, added]}},
      prevCart: {lines: {nodes: [existing]}},
    });
    expect(params?.content_ids).toEqual(['4455667788']);
  });
});

describe('event ids', () => {
  it('are unique per event', () => {
    const a = createMetaEventId('AddToCart');
    const b = createMetaEventId('AddToCart');
    expect(a).not.toBe(b);
    expect(a.startsWith('AddToCart.')).toBe(true);
  });
});

describe('urlPath', () => {
  it('returns the path only', () => {
    expect(
      urlPath('https://drinksleepfuel.com/products/sleepfuel-drink-mix?x=1'),
    ).toBe('/products/sleepfuel-drink-mix');
    expect(urlPath('/cart')).toBe('/cart');
    expect(urlPath(undefined)).toBeNull();
  });
});
