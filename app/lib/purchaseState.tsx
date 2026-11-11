import {createContext, useContext, useMemo, useState} from 'react';
import {
  DEFAULT_PACK_KEY,
  type PackKey,
  type PurchaseMode,
} from '~/lib/sleepfuelProduct';

type PurchaseState = {
  packKey: PackKey;
  setPackKey: (k: PackKey) => void;
  mode: PurchaseMode;
  setMode: (m: PurchaseMode) => void;
};

const PurchaseStateContext = createContext<PurchaseState | null>(null);

/**
 * Holds the selected pack and purchase mode.
 *
 * The buy box, the sticky add-to-cart bar, and the analytics payload all read
 * the same selection. It lives in context rather than in the product route
 * because Weaverse renders sections independently — a section cannot receive
 * `packKey` as a prop from a sibling.
 */
export function PurchaseStateProvider({children}: {children: React.ReactNode}) {
  const [packKey, setPackKey] = useState<PackKey>(DEFAULT_PACK_KEY);
  const [mode, setMode] = useState<PurchaseMode>('subscribe');

  const value = useMemo(
    () => ({packKey, setPackKey, mode, setMode}),
    [packKey, mode],
  );

  return (
    <PurchaseStateContext.Provider value={value}>
      {children}
    </PurchaseStateContext.Provider>
  );
}

/**
 * Reads the current selection. Falls back to the shipped defaults when no
 * provider is mounted, so a section dropped onto a non-product page in Studio
 * still renders instead of throwing.
 */
export function usePurchaseState(): PurchaseState {
  const ctx = useContext(PurchaseStateContext);

  if (!ctx) {
    return {
      packKey: DEFAULT_PACK_KEY,
      setPackKey: () => {},
      mode: 'subscribe',
      setMode: () => {},
    };
  }

  return ctx;
}
