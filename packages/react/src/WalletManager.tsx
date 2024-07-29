import { NearContext } from "@chain-deployed-ui/presets/react";
import {
  setupModal,
  WalletSelectorModal,
} from "@near-wallet-selector/modal-ui";
import "@near-wallet-selector/modal-ui/styles.css";

import { useContext, useEffect, useState } from "react";

function WalletManager() {
  const wallet = useContext(NearContext);

  const [modal, setModal] = useState<WalletSelectorModal>();

  useEffect(() => {
    console.log("wallet", wallet);
    if (wallet) {
      setModal(
        setupModal(wallet, {
          contractId: "mpps1.testnet",
          theme: "light",
        })
      );
    }
  }, [wallet]);

  return (
    <button
      onClick={() => {
        modal?.show();
      }}
    >
      Sign In
    </button>
  );
}

export default WalletManager;
