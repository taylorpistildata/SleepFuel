import {useLoaderData, data, type HeadersFunction} from 'react-router';
import type {Route} from './+types/cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {SALE_MAX_QTY, isSaleLine, isSaleLive} from '~/lib/blackFriday';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = inputs.giftCardCode;

      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes as string[];
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  // Black Friday: at most SALE_MAX_QTY of the sale item per cart. Shopify
  // merges repeat adds into one line, so after any add or update, clamp the
  // sale line back to the limit and drop extra sale lines.
  if (
    isSaleLive() &&
    (action === CartForm.ACTIONS.LinesAdd ||
      action === CartForm.ACTIONS.LinesUpdate)
  ) {
    result = await enforceSaleLimit(cart, result);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}

type CartHandler = Route.ActionArgs['context']['cart'];

async function enforceSaleLimit(
  cart: CartHandler,
  result: CartQueryDataReturn,
): Promise<CartQueryDataReturn> {
  const current = await cart.get();
  const saleLines = (current?.lines?.nodes ?? []).filter(isSaleLine);
  const total = saleLines.reduce((sum, line) => sum + line.quantity, 0);
  if (total <= SALE_MAX_QTY) return result;

  const [keep, ...extra] = saleLines;
  if (extra.length) {
    await cart.removeLines(extra.map((line) => line.id));
  }
  const fixed = await cart.updateLines([{id: keep.id, quantity: SALE_MAX_QTY}]);
  return {
    ...fixed,
    warnings: [
      ...(fixed.warnings ?? []),
      {
        code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
        message: `The Black Friday offer is limited to ${SALE_MAX_QTY} per customer.`,
        target: keep.id,
      },
    ] as CartQueryDataReturn['warnings'],
  };
}
