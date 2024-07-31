import type {
  Wallet,
  WalletSelector,
  WalletSelectorState,
} from "@near-wallet-selector/core";
import type { SignMessageMethod } from "@near-wallet-selector/core/src/lib/wallet";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  setupModal,
  WalletSelectorModal,
} from "@near-wallet-selector/modal-ui";

import { NearContext } from "@chain-deployed-ui/presets/react";

export const useWallet = () => {
  const walletSelector = useContext(NearContext);

  const [wallet, setWallet] = useState<(Wallet & SignMessageMethod) | null>(
    null
  );
  const [walletSelectorState, setWalletSelectorState] =
    useState<WalletSelectorState | null>(null);
  const account = walletSelectorState?.accounts[0] ?? null;

  const [walletSelectorModal, setWalletSelectorModal] =
    useState<WalletSelectorModal>();

  const updateWalletState = useCallback(
    async (ws: WalletSelector, value: WalletSelectorState) => {
      setWalletSelectorState(value);

      if (value.accounts.length > 0 && value.selectedWalletId && ws) {
        const wallet = await ws.wallet();
        setWallet(wallet);
      } else {
        setWallet(null);
      }
    },
    []
  );

  useEffect(() => {
    if (walletSelector) {
      setWalletSelectorModal(
        setupModal(walletSelector, {
          contractId: "mpps1.testnet",
          theme: "light",
        })
      );
    }
  }, [walletSelector]);

  useEffect(() => {
    if (!walletSelector) return;

    setWalletSelectorState(walletSelector.store.getState());

    const subscription = walletSelector.store.observable.subscribe((value) => {
      updateWalletState(walletSelector, value).catch((e) => console.error(e));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [walletSelector, updateWalletState]);

  return {
    account,
    hasResolved: !!walletSelectorState,
    wallet,
    walletSelector,
    walletSelectorModal,
    walletSelectorState,
  };
};
