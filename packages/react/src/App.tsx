import {
  NearContext,
  NearDappProvider,
} from "@chain-deployed-ui/presets/react";
import { useContext } from "react";

import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const wallet = useContext(NearContext);
  return (
    <NearDappProvider>
      <div>
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

        <h2>wallet initialized? {(wallet === null).toString()}</h2>
        <h2>signed in? {(wallet?.isSignedIn() || false).toString()}</h2>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
    </NearDappProvider>
  );
}

export default App;
