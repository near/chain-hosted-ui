import { JsonRpcProvider } from '@near-js/providers';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());

const sourceCache = new Map<string, string>();

app.get('/*', async function (req, res) {
  const key = req.path.slice(1);
  let cached: string | undefined = sourceCache.get(key);
  console.log(key)
  try {
    if (!cached) {
      const [accountId, ...filecomponents] = key.split('/');
      const filename = filecomponents.join('/')
      const provider = new JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });

      const { result } = await provider.query({
        request_type: 'call_function',
        account_id: 'fs0.testnet',
        method_name: 'get_file',
        finality: 'optimistic',
        args_base64: Buffer.from(new TextEncoder().encode(JSON.stringify({
          account_id: accountId,
          filename,
        }))).toString('base64')
      });

      const filestring = JSON.parse(`{ "bytes": ${Buffer.from(result).toString()} }`)
      sourceCache.set(req.path, filestring.bytes);
      cached = filestring.bytes.trim();
    }
  } catch (e) {
    console.error(e)
    res.send(`unknown key ${key}`);
    return;
  }

  const [componentName] = key.split('/').slice(-1);
  if (req.path.endsWith('.css')) {
    res.set('Content-Type', 'text/css');
    res.send(cached!);
    return;
  }

  if (req.path.endsWith('.js')) {
    res.set('Content-Type', 'text/javascript');
    res.send(cached!);
    return;
  }

  res.send(`unknown key ${key}`);
});

app.listen(3003);
