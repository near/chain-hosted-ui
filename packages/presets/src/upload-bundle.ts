import { Account } from '@near-js/accounts';
import { UnencryptedFileSystemKeyStore } from '@near-js/keystores-node';
import { JsonRpcProvider } from '@near-js/providers';
import { InMemorySigner } from '@near-js/signers';
import { getTransactionLastResult } from '@near-js/utils';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface BundleAsset {
  contentPath: string;
  fileContents: string;
  filename: string;
  partitions: number;
}

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
  const { files, aggregated: { totalBytes, totalPartitions } } = fs.readdirSync(distPath, { recursive: true })
    .map((f) => f.toString())
    .filter((e) => (e.endsWith('.gz') || e.endsWith('.html')) && !e.endsWith('.html.gz'))
    .reduce(({ files, aggregated }: { files: BundleAsset[], aggregated: { totalBytes: number, totalPartitions: number } }, filename) => {
      const fileContents = fs.readFileSync(path.resolve(distPath, filename)).toString('base64');
      const asset = {
        contentPath: `${deployerAccount}/${application}/${filename.replace(/\.gz$/, '')}`,
        fileContents,
        filename: filename.replace(/\.gz$/, ''),
        partitions: Math.ceil(fileContents.length / PARTITION_SIZE),
      };
      aggregated.totalPartitions += asset.partitions;
      aggregated.totalBytes += fileContents.length;
      files.push(asset);

      return { files, aggregated };
    }, { files: [], aggregated: { totalBytes: 0, totalPartitions: 0 } });

  const { applicationStorageCost, breakdown } = await deployer.viewFunction({
    contractId: fileContract,
    methodName: 'calculate_application_storage_cost',
    args: {
      account_id: deployerAccount,
      application,
      partitionedFiles: files.reduce((fileMap, { filename, partitions }) => {
        fileMap[filename] = partitions;
        return fileMap;
      }, {} as { [key: string]: number }),
      fileBytes: totalBytes,
    },
  });

  console.log(`${application} deployment calculated to cost ${applicationStorageCost} yN`, breakdown)

  if (isLiveRun === true) {
    await deployer.functionCall({
      contractId: fileContract,
      methodName: 'storage_deposit',
      args: {
        account_id: null,
        registration_only: false,
      },
      attachedDeposit: BigInt(applicationStorageCost),
      gas: BigInt('300000000000000'),
    });

    const deployResult = await deployer.functionCall({
      contractId: fileContract,
      methodName: 'deploy_application',
      args: {
        application,
        files: files.map(({ filename }) => filename),
      },
      gas: BigInt('300000000000000'),
    });
    console.log({ deployResult: getTransactionLastResult(deployResult) })
  }

  for (let { contentPath, fileContents, filename, partitions } of files) {
    console.log(`[${contentPath}] uploading in ${partitions} parts... (${filename})`)

    let i = 0;
    while (i < partitions) {
      const bytes = fileContents.slice(i * PARTITION_SIZE, (i * PARTITION_SIZE) + PARTITION_SIZE);
      console.log(`[${filename}] ${i+1}/${partitions} (${bytes.length})...`)

      if (isLiveRun === true) {
        const uploadResult = await deployer.functionCall({
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
        console.log({ uploadResult: getTransactionLastResult(uploadResult) })
      }
      i++;
    }

    console.log(`[${filename}] uploaded ${i}/${partitions}`)
  }

  console.log(`all files uploaded for ${application}, beginning post-deploy actions`)
  if (isLiveRun === true) {
    const cleanupResult = await deployer.functionCall({
      contractId: fileContract,
      methodName: 'post_deploy_cleanup',
      args: {
        application,
      },
      gas: BigInt('300000000000000'),
    });
    console.log({ cleanupResult: getTransactionLastResult(cleanupResult) })
  }
}

deployFiles().catch((e) => console.error(e));
