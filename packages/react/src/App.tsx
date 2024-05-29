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
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <KeysGenerator msg="Vite + React" generateKey={generateKey} />
      </div>
    </>
  );
}

export default App;
