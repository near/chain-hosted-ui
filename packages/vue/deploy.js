import { Account } from '@near-js/accounts';
import { UnencryptedFileSystemKeyStore } from '@near-js/keystores-node';
import { JsonRpcProvider } from '@near-js/providers';
import { InMemorySigner } from '@near-js/signers';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import BOSConfig from './bos.json' assert { type: 'json' };

const { environments } = BOSConfig

const PARTITION_SIZE = 100_000;

async function deployAssets() {
  const [,, network] = process.argv;
  const { rpcUrl, fileContract, deployerAccount } = environments[network || 'testnet'];

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const signer = new InMemorySigner(new UnencryptedFileSystemKeyStore(path.resolve(os.homedir(), '.near-credentials')));
  const deployer = new Account(
    { networkId: 'testnet', provider, signer },
    deployerAccount
  );

  const filePaths = fs.readdirSync('./dist', { recursive: true })
    .filter((e) => e.endsWith('.js.gz') || e.endsWith('.css.gz') || e.endsWith('.html')) // TODO why isn't dirent.isFile() working here?
    .map((p) => p.replace('dist/', ''))

  for (let filename of filePaths) {
    const bundleBinary = fs.readFileSync(`./dist/${filename}`).toString('base64');
    filename = filename.replace('assets/', '').replace('.gz', '');
    let i = 0;
    const partitions = Math.ceil(bundleBinary.length / PARTITION_SIZE);
    console.log(`uploading ${filename} in ${partitions} parts...`)
    while (i < partitions) {
      const bytes = bundleBinary.slice(i * PARTITION_SIZE, (i * PARTITION_SIZE) + PARTITION_SIZE);
      console.log(`part ${i+1} (${bytes.length})...`)
      await deployer.functionCall({
        contractId: fileContract,
        methodName: 'upload_file',
        args: {
          filename,
          bytes,
          part: i,
          totalParts: partitions,
        },
        gas: BigInt('300000000000000'),
      });
      i++;
      console.log(`part ${i} uploaded!`)
    }
  }
}

deployAssets().catch((e) => console.error(e));
