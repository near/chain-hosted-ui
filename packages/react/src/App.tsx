import { NearContext, NearDappProvider } from '@chain-deployed-ui/react-preset'
import { useContext } from 'react';
import * as nacl from "tweetnacl";

import "./App.css";
import reactLogo from "./assets/react.svg";
import { KeysGenerator } from "./components/KeysGenerator";
import viteLogo from "/vite.svg";


function App({
  generateKey,
}: {
  generateKey: (secret: string) => nacl.BoxKeyPair;
}) {
  const wallet = useContext(NearContext);
  return (
    <NearDappProvider>
      <div>
        <h2>wallet initialized? {(wallet === null).toString()}</h2>
        <h2>signed in? {(wallet?.isSignedIn() || false).toString()}</h2>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <KeysGenerator msg="Vite + React" generateKey={generateKey} />
      </div>
    </NearDappProvider>
  );
}

export default App;
