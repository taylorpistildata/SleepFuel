import {useEffect, useRef} from 'react';
import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  onAdded,
  className,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  /** Called once the add has finished on the server without errors. */
  onAdded?: () => void;
  className?: string;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          {onAdded ? (
            <AddedWatcher fetcher={fetcher} onAdded={onAdded} />
          ) : null}
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
            className={
              className ??
              'inline-flex items-center justify-center rounded-full bg-transparent p-0 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
            }
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}

/** Fires onAdded when this form's submission comes back without errors. */
function AddedWatcher({
  fetcher,
  onAdded,
}: {
  fetcher: FetcherWithComponents<any>;
  onAdded: () => void;
}) {
  const wasBusy = useRef(false);
  useEffect(() => {
    if (fetcher.state !== 'idle') {
      wasBusy.current = true;
      return;
    }
    if (!wasBusy.current) return;
    wasBusy.current = false;
    const errors = (fetcher.data as {errors?: unknown[]} | undefined)?.errors;
    if (!errors?.length) onAdded();
  }, [fetcher.state, fetcher.data, onAdded]);
  return null;
}
