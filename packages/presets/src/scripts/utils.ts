

import { Account } from '@near-js/accounts';
import { UnencryptedFileSystemKeyStore } from '@near-js/keystores-node';
import { JsonRpcProvider } from '@near-js/providers';
import { InMemorySigner } from '@near-js/signers';
import { formatNearAmount, getTransactionLastResult } from '@near-js/utils';
import * as os from 'node:os';
import * as path from 'node:path';

interface GetAccountParams {
  accountId: string;
  network: string;
}

interface ListAppFilesParams {
  deployer: Account;
  fileContract: string;
  application: string;
}

interface DeleteFileParams extends DeleteFilesParams {
  filepath: string;
}

interface DeleteFilesParams {
  deployer: Account;
  fileContract: string;
  application: string;
  isLive: boolean;
}

interface DeleteApplicationParams {
  deployer: Account;
  fileContract: string;
  application: string;
}

interface UnregisterParams {
  deployer: Account;
  fileContract: string;
}

interface GetStorageBalanceParams {
  deployer: Account;
  fileContract: string;
}

interface CalculateApplicationDeploymentCostParams {
  deployer: Account;
  fileContract: string;
  application: string;
  totalBytes: number;
  files: { filename: string; partitions: number }[];
}

export const PARTITION_SIZE = 600_000;

export function getAccount({accountId, network}: GetAccountParams) {
  let rpcUrl;
  switch (network || 'testnet') {
    case 'testnet':
      rpcUrl = 'https://rpc.testnet.pagoda.co';
      break;
    case 'mainnet':
      rpcUrl = 'https://rpc.near.org';
      break;
    default:
      throw new Error(`undefined environment ${network}`)
  }

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const signer = new InMemorySigner(new UnencryptedFileSystemKeyStore(path.resolve(os.homedir(), '.near-credentials')));
  return new Account(
    // @ts-ignore
    { networkId: network || 'testnet', provider, signer },
    accountId
  );
}

export function listAppFiles({deployer, fileContract, application}: ListAppFilesParams): Promise<string[]> {
  return deployer.viewFunction({
    contractId: fileContract,
    methodName: 'list_application_files',
    args: {
      account_id: deployer.accountId,
      application,
    },
  });
}

export async function deleteFile({deployer, fileContract, application, filepath, isLive}: DeleteFileParams) {
  const deleteFunctionCall = async () => {
    const result = await deployer.functionCall({
      contractId: fileContract,
      methodName: 'delete_file',
      args: {
        application,
        filepath,
      },
      gas: 300000000000000n,
    });

    return getTransactionLastResult(result).remainingParts as number;
  };

  let remainingParts = 1;
  while (remainingParts > 0) {
    if (isLive) {
      remainingParts = await deleteFunctionCall();
      if (remainingParts === -1) {
        console.log(`no file entry found for ${filepath} in ${application}`)
      }

      while (remainingParts > 0) {
        console.log(`[${filepath}] ${remainingParts} parts remaining to delete...`);
        remainingParts = await deleteFunctionCall();
      }
    }
  }
}

export async function deleteFiles({ deployer, fileContract, application, isLive }: DeleteFilesParams) {
  const { previousFiles } = await getApplication({ deployer, fileContract, application })
  if (previousFiles.length) {
    console.log(`deleting ${previousFiles.length} files...`);
    for (let filepath of previousFiles) {
      await deleteFile({ deployer, fileContract, application, filepath, isLive })
    }
  }
}

export async function deleteApplication({deployer, fileContract, application}: DeleteApplicationParams) {
  const outcome = await deployer.functionCall({
    contractId: fileContract,
    methodName: 'delete_application',
    args: {
      account_id: deployer.accountId,
      application,
    },
    gas: 300000000000000n,
  });

  return {
    response: getTransactionLastResult(outcome),
    transactionId: outcome.transaction.transactionId,
  }
}

export async function getStorageBalance({deployer, fileContract}: GetStorageBalanceParams) {
  return deployer.viewFunction({
    contractId: fileContract,
    methodName: 'storage_balance_of',
    args: {
      account_id: deployer.accountId,
    },
  });
}

export async function withdrawAvailableBalance({deployer, fileContract}: UnregisterParams) {
  const { available } = await deployer.viewFunction({
    contractId: fileContract,
    methodName: 'storage_balance_of',
    args: {
      account_id: deployer.accountId,
    },
  });

  console.log(`refunding available balance of ${formatNearAmount(available)}`)
  await deployer.functionCall({
    contractId: fileContract,
    methodName: 'storage_withdraw',
    args: {
      amount: available,
    },
    attachedDeposit: 1n,
    gas: 300000000000000n,
  });
}

export async function unregister({deployer, fileContract}: UnregisterParams) {
  console.log(`unregistering ${deployer.accountId}...`)
  await deployer.functionCall({
    contractId: fileContract,
    methodName: 'storage_unregister',
    args: {},
    attachedDeposit: 1n,
    gas: 300000000000000n,
  });
}

export function calculateApplicationDeploymentCost({deployer, fileContract, application, totalBytes, files}: CalculateApplicationDeploymentCostParams ) {
  return deployer.viewFunction({
    contractId: fileContract,
    methodName: 'calculate_application_storage_cost',
    args: {
      account_id: deployer.accountId,
      application,
      partitionedFiles: files.reduce((fileMap, { filename, partitions }) => {
        fileMap[filename] = partitions;
        return fileMap;
      }, {} as { [key: string]: number }),
      fileBytes: totalBytes,
    },
  });
}

export async function depositDeploymentStorageCost({ deployer, fileContract, applicationStorageCost }: { deployer: Account, fileContract: string, applicationStorageCost: number }) {
  const depositResult = await deployer.functionCall({
    contractId: fileContract,
    methodName: 'storage_deposit',
    args: {
      account_id: null,
      registration_only: false,
    },
    attachedDeposit: BigInt(applicationStorageCost),
    gas: 300000000000000n,
  });

  return getTransactionLastResult(depositResult);
}

export async function deployApplication({ deployer, fileContract, application, files }: { deployer: Account, fileContract: string, application: string, files: string[] }) {
  const outcome = await deployer.functionCall({
    contractId: fileContract,
    methodName: 'deploy_application',
    args: {
      application,
      files,
    },
    gas: 300000000000000n,
  });

  return getTransactionLastResult(outcome);
}

export async function uploadFile({ deployer, fileContract, fileContents, partitions, application, filename, isLive }: { deployer: Account, fileContents: string, partitions: number, application: string, fileContract: string, filename: string, isLive: boolean }) {
  let i = 0;
  while (i < partitions) {
    const bytes = fileContents.slice(i * PARTITION_SIZE, (i * PARTITION_SIZE) + PARTITION_SIZE);
    console.log(`[${filename}] ${i+1}/${partitions} (${bytes.length})...`)

    if (isLive) {
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
        gas: 300000000000000n,
      });
      console.log({ uploadResult: getTransactionLastResult(uploadResult) })
    }
    i++;
  }

  console.log(`[${filename}] uploaded ${i}/${partitions}`)
}

export async function postDeployCleanup({ deployer, fileContract, application }: { deployer: Account, application: string, fileContract: string }) {
  const cleanupResult = await deployer.functionCall({
    contractId: fileContract,
    methodName: 'post_deploy_cleanup',
    args: {
      application,
    },
    gas: 300000000000000n,
  });

  return getTransactionLastResult(cleanupResult);
}

export function getApplication({ deployer, fileContract, application }: { deployer: Account, application: string, fileContract: string }) {
  return deployer.viewFunction({
    contractId: fileContract,
    methodName: 'get_application',
    args: {
      account_id: deployer.accountId,
      application,
    },
    gas: 300000000000000n,
  });
}
