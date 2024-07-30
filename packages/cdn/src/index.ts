import { JsonRpcProvider } from '@near-js/providers';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());

const sourceCache = new Map<string, Uint8Array>();

interface QueryParams {
  method: string;
  accountId: string;
  filename: string;
  part?: number;
  application?: string;
  filestoreContract: string;
}


const ContentHeaders: { [key: string]: { [key: string]: string } } = {
  css: {
    'Content-Type': 'text/css',
    'Content-Encoding': 'gzip',
  },
  js: {
    'Content-Type': 'text/javascript',
    'Content-Encoding': 'gzip',
  },
  svg: {
    'Content-Type': 'image/svg+xml',
    'Content-Encoding': 'gzip',
  },
  html: {
    'Content-Type': 'text/html',
  },
};

const query = async ({ filestoreContract, method, accountId, filename, part, application }: QueryParams) => {
  const isTestnet = filestoreContract.endsWith('testnet');
  const provider = new JsonRpcProvider({ url: isTestnet ? 'https://rpc.testnet.near.org' : 'https://rpc.near.org' });

  // @ts-expect-error FIXME typing
  const { result } = await provider.query<{ result: Buffer }>({
    request_type: 'call_function',
    account_id: filestoreContract,
    method_name: method,
    finality: 'optimistic',
    args_base64: Buffer.from(new TextEncoder().encode(JSON.stringify({
      account_id: accountId,
      filename,
      ...(part !== undefined ? { part } : {}),
      ...(application !== undefined ? { application } : {}),
    }))).toString('base64'),
  });

  if (Buffer.from(result).toString() === 'null') {
    return null;
  }

  return result;
};

app.get('/*', async function (req, res) {
  const key = req.path.slice(1);
  let cached: Uint8Array | undefined = sourceCache.get(key);
  console.log(key);
  const [filestoreContract, accountId, application, ...filecomponents] = key.split('/');
  const filename = filecomponents.filter((c, i) => i === 0 ? c !== application : true).join('/') || 'index.html';
  try {
    if (!cached) {
      let rawParts: Buffer | null = null;
      try {
        rawParts = await query({
          method: 'get_parts',
          accountId: accountId!,
          filename,
          part: undefined,
          application,
          filestoreContract: filestoreContract!,
        });
      } catch { /* assume exceptions are non-existent files */
      }

      if (!rawParts) {
        res.statusCode = 404;
        res.send(`no entry for ${filename}`);
        return;
      }
      const parts: number = parseInt(Buffer.from(rawParts).toString());

      const requests = (new Array(parts))
        // @ts-ignore
        .fill()
        .map((_, i) => query({
          method: 'get_partition',
          accountId: accountId!,
          filename,
          part: i,
          application,
          filestoreContract: filestoreContract!,
        }));

      const partitions = await Promise.all(requests);

      // @ts-ignore
      cached = Buffer.from(Buffer.from(partitions.flat()).toString(), 'base64');
      sourceCache.set(req.path, cached);
    }
  } catch (e: any) {
    console.log({ accountId, application, filename });
    res.statusCode = 500;
    res.send(`error fetching ${key}: ${e.toString()}`);
    return;
  }

  const [extension] = filename.split('.').slice(-1);
  const contentHeaders = ContentHeaders[extension!];
  if (!contentHeaders) {
    res.send(`unknown key ${key}`);
    return;
  }

  Object.entries(contentHeaders).forEach(([key, value]: [string, string]) => res.set(key, value));
  res.send(cached);
  return;
});

app.listen(3003);
