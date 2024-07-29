import { NearDappProvider } from "@chain-deployed-ui/presets/react";

import "./App.css";
import reactLogo from "./assets/react.svg";
import nearLogo from "./assets/near.svg";
import WalletManager from "./WalletManager";

function App() {
  return (
    <NearDappProvider>
      <div>
        <div className="iconRow">
          <img src={nearLogo} className="logo" alt="NEAR logo" />
          <img src={reactLogo} className="logo react" alt="React logo" />
        </div>
        <h1>Chain Hosted UI - React</h1>
        <p className="landingText">
          This is an example React application deployed to the NEAR blockchain.
          The React app is bundled using Vite and the compressed output is
          stored in the state of a smart contract.
        </p>
        <p className="landingText">
          A gateway is required to access chain hosted UIs. This gateway is a
          small node server running on a standard web host. It is responsible
          for responding to browser resource requests with the appropriate
          assets fetched via RPC from the contract.
        </p>
        <WalletManager />
      </div>
    </NearDappProvider>
  );
}

export default App;
