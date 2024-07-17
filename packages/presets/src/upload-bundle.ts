import { Account } from '@near-js/accounts';
import { UnencryptedFileSystemKeyStore } from '@near-js/keystores-node';
import { JsonRpcProvider } from '@near-js/providers';
import { InMemorySigner } from '@near-js/signers';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const PARTITION_SIZE = 600_000;

export async function deployFiles() {
  const [,, basePath, network, fileContract, deployerAccount, application, isLiveRun = true] = process.argv;
  let rpcUrl;
  switch (network || 'testnet') {
    case 'testnet':
      rpcUrl = 'https://rpc.testnet.pagoda.co';
      break;
    case 'mainnet':
      rpcUrl = 'https://rpc.near.org';
      break;
    default:
      throw new Error('undefined environment')
  }

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const signer = new InMemorySigner(new UnencryptedFileSystemKeyStore(path.resolve(os.homedir(), '.near-credentials')));
  const deployer = new Account(
    // @ts-ignore
    { networkId: network || 'testnet', provider, signer },
    deployerAccount
  );

  const distPath = path.resolve(process.env.PWD as string, basePath);
  const filePaths = fs.readdirSync(distPath, { recursive: true })
    .map((f) => f.toString())
    .filter((e) => (e.endsWith('.gz') || e.endsWith('.html')) && !e.endsWith('.html.gz'))
    .reduce((files: unknown[], filename) => {
      const fileContents = fs.readFileSync(path.resolve(distPath, filename)).toString('base64');
      files.push({
        contentPath: `${deployerAccount}/${application}/${filename.replace(/\.gz$/, '')}`,
        fileContents,
        filename: filename.replace(/\.gz$/, ''),
        totalPartitions: Math.ceil(fileContents.length / PARTITION_SIZE),
      });
      return files;
    }, []);

  if (isLiveRun === true) {
    await deployer.functionCall({
      contractId: fileContract,
      methodName: 'deploy_application',
      args: {
        application,
        files: contentPaths,
      },
      gas: BigInt('300000000000000'),
    });
  }

  for (let [fileIndex, filename] of filePaths.entries()) {
    const bundleBinary = fs.readFileSync(path.resolve(distPath, filename)).toString('base64');
    const contentPath = contentPaths[fileIndex];

    let i = 0;
    const partitions = Math.ceil(bundleBinary.length / PARTITION_SIZE);
    console.log(`[${contentPath}] uploading in ${partitions} parts...`)
    while (i < partitions) {
      const bytes = bundleBinary.slice(i * PARTITION_SIZE, (i * PARTITION_SIZE) + PARTITION_SIZE);
      console.log(`[${filename}] ${i+1}/${partitions} (${bytes.length})...`)
      if (isLiveRun === true) {
        await deployer.functionCall({
          contractId: fileContract,
          methodName: 'upload_file_partition',
          args: {
            application,
            filename: filename.replace(/\.gz$/, ''),
            bytes,
            part: i,
            totalParts: partitions,
          },
          gas: BigInt('300000000000000'),
        });
      }
      i++;
    }
    console.log(`[${filename}] uploaded ${i}/${partitions}`)
  }


  console.log(`all files uploaded for ${application}, beginning post-deploy actions`)
  if (isLiveRun === true) {
    // @ts-ignore
    (await deployer.functionCall({
      contractId: fileContract,
      methodName: 'post_deploy_cleanup',
      args: {
        application,
      },
      gas: BigInt('300000000000000'),
    }));
  }
}

deployFiles().catch((e) => console.error(e));
