import { NearContext, NearDappProvider } from '@chain-deployed-ui/presets/react'
import { useContext } from 'react';

import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";


function App() {
  const wallet = useContext(NearContext);
  return (
    <NearDappProvider>
      <div>
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
