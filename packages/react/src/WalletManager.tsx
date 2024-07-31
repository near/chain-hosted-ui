import "@near-wallet-selector/modal-ui/styles.css";

import { useEffect } from "react";
import { useWallet } from "./useWallet";

function WalletManager() {
  const { account, wallet, walletSelectorModal } = useWallet();

  useEffect(() => {
    console.log("walletDeets", account);
  }, [account]);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <button
        onClick={() => {
          if (account) {
            wallet?.signOut().catch(console.error);
          } else {
            walletSelectorModal?.show();
          }
        }}
      >
        {account ? "Sign Out" : "Sign In (testnet)"}
      </button>
      {account && <span>Signed in as: {account.accountId}</span>}
    </div>
  );
}

export default WalletManager;
