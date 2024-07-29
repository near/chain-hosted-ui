import type { Wallet, WalletSelectorState } from "@near-wallet-selector/core";
import type { SignMessageMethod } from "@near-wallet-selector/core/src/lib/wallet";
import { useContext, useEffect, useState } from "react";

import { NearContext } from "@chain-deployed-ui/presets/react";

export const useWallet = () => {
  const walletSelector = useContext(NearContext);

  if (!walletSelector) {
    throw new Error(
      "useWallet() must be used inside the context provided by <NearDappProvider>"
    );
  }

  const [wallet, setWallet] = useState<(Wallet & SignMessageMethod) | null>(
    null
  );
  const [walletSelectorState, setWalletSelectorState] =
    useState<WalletSelectorState | null>(null);
  const account = walletSelectorState?.accounts[0] ?? null;

  useEffect(() => {
    if (!walletSelector) return;

    setWalletSelectorState(walletSelector.store.getState());

    const subscription = walletSelector.store.observable.subscribe(
      async (value) => {
        setWalletSelectorState(value);

        if (
          value.accounts.length > 0 &&
          value.selectedWalletId &&
          walletSelector
        ) {
          const wallet = await walletSelector.wallet();
          setWallet(wallet);
        } else {
          setWallet(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [walletSelector]);

  return {
    account,
    hasResolved: !!walletSelectorState,
    wallet,
    walletSelector,
    walletSelectorState,
  };
};
