import * as nacl from "tweetnacl";

import App from "./App.tsx";

const generateKey = (secret: string) =>
  nacl.box.keyPair.fromSecretKey(new TextEncoder().encode(secret));

function BosRoot() {
  return <App generateKey={generateKey} />;
}

export default BosRoot;
