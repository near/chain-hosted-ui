import { JsonRpcProvider } from '@near-js/providers';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());

const sourceCache = new Map<string, Uint8Array>();

const query = async (method: string, accountId: string, filename: string, part?: number, application?: string) => {
  const provider = new JsonRpcProvider({ url: 'https://rpc.testnet.pagoda.co' });

  // @ts-expect-error FIXME typing
  const { result } = await provider.query<{ result: Buffer }>({
    request_type: 'call_function',
    account_id: 'partfs1.testnet',
    method_name: method,
    finality: 'optimistic',
    args_base64: Buffer.from(new TextEncoder().encode(JSON.stringify({
      account_id: accountId,
      filename,
      ...(part !== undefined ? { part } : {}),
      ...(application !== undefined ? { application } : {}),
    }))).toString('base64')
  });

  if (Buffer.from(result).toString() === 'null') {
    return null;
  }

  return result;
}

app.get('/*', async function (req, res) {
  const key = req.path.slice(1);
  let cached: Uint8Array | undefined = sourceCache.get(key);
  console.log(key)
  const [accountId, application, ...filecomponents] = key.split('/');
  const filename = filecomponents.filter((c, i) => i === 0 ? c !== application : true).join('/')
  try {
    if (!cached) {
      const rawParts = await query('get_parts', accountId!, filename || 'index.html', undefined, application);

      if (!rawParts) {
        res.statusCode = 404;
        res.send(`no entry for ${filename}`);
        return;
      }
      const parts: number = parseInt(Buffer.from(rawParts).toString());

      const requests = (new Array(parts))
        // @ts-ignore
        .fill()
        .map((_, i) => query('get_partition', accountId!, filename, i, application));

      const partitions = await Promise.all(requests);

      // @ts-ignore
      cached = Buffer.from(Buffer.from(partitions.flat()).toString(), 'base64');
      sourceCache.set(req.path, cached);
    }
  } catch (e: any) {
    console.log({ accountId, application, filename })
    res.send(`error fetching ${key}: ${e.toString()}`);
    return;
  }

  if (req.path.endsWith('.css')) {
    res.set('Content-Type', 'text/css');
    res.set('Content-Encoding', 'gzip');
    res.send(cached!);
    return;
  }

  if (req.path.endsWith('.js')) {
    res.set('Content-Type', 'text/javascript');
    res.set('Content-Encoding', 'gzip');
    res.send(cached!);
    return;
  }

  if (req.path.endsWith('.svg')) {
    res.set('Content-Type', 'text/svg+xml');
    res.set('Content-Encoding', 'gzip');
    res.send(cached!);
    return;
  }

  if (req.path.endsWith('.html') || !filename) {
    res.set('Content-Type', 'text/html');
    res.send(cached!);
    return;
  }

  res.send(`unknown key ${key}`);
});

app.listen(3003);
