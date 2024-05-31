import { useMemo, useState } from "react";
import type { BoxKeyPair } from "tweetnacl";

const decode = (u: Uint8Array) => new TextDecoder("utf-16").decode(u);

export const KeysGenerator = ({
  generateKey,
  msg,
}: {
  generateKey: (secret: string) => BoxKeyPair;
  msg: string;
}) => {
  const [count, setCount] = useState(0);

  const generatedKey = useMemo(
    () =>
      generateKey(
        `${(count * new Date().valueOf()).toString()}secretsecretsecretsecretsecret!`.slice(
          0,
          32
        )
      ),
    [generateKey, count]
  );

  return (
    <>
      <h1>{msg}</h1>
      <div className="card">
        <button type="button" onClick={() => setCount((count) => count + 1)}>
          generate new key pair
        </button>
      </div>
      <h2>public: {decode(generatedKey.publicKey)}</h2>
      <h2>private: {decode(generatedKey.secretKey)}</h2>
    </>
  );
};
