import { Account } from '@near-js/accounts';
import { UnencryptedFileSystemKeyStore } from '@near-js/keystores-node';
import { JsonRpcProvider } from '@near-js/providers';
import { InMemorySigner } from '@near-js/signers';
import { getTransactionLastResult } from '@near-js/utils';
import * as os from 'node:os';
import * as path from 'node:path';

export async function deleteApplication() {
  const [,, network, fileContract, deployerAccount, application, appVersion, isLiveRun = true] = process.argv;
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
  const deployer = new Account(
    // @ts-ignore
    { networkId: network || 'testnet', provider, signer },
    deployerAccount
  );

  const isLive = isLiveRun === true;

  function listAppFiles() {
    return deployer.viewFunction({
      contractId: fileContract,
      methodName: 'list_application_files',
      args: {
        account_id: deployerAccount,
        application,
      },
    });
  }

  async function deleteFile(filename: string) {
    const parts: number = await deployer.viewFunction({
      contractId: fileContract,
      methodName: 'get_parts',
      args: {
        account_id: deployerAccount,
        application,
        filename,
      },
    });

    const deleteFunctionCall = async () => {
      const result = await deployer.functionCall({
        contractId: fileContract,
        methodName: 'delete_file',
        args: {
          appVersion,
          application,
          filename,
        },
        gas: BigInt('300000000000000'),
      });

      return getTransactionLastResult(result).remainingParts;
    };

    let i = 0;
    while (i++ < parts) {
      console.log(`[${filename}] deleting part ${i}/${parts}...`);
      if (isLive) {
        let remainingParts = await deleteFunctionCall();
        if (remainingParts === -1) {
          console.log(`no file entry found for ${filename} v${appVersion} in ${application}`)
        }

        while (remainingParts > 0) {
          console.log(`[${filename}] ${remainingParts} parts remaining to delete...`);
          remainingParts = await deleteFunctionCall();
        }
      }
    }
  }

  function deleteApplication() {
    return deployer.functionCall({
      contractId: fileContract,
      methodName: 'delete_application',
      args: {
        account_id: deployerAccount,
        application,
      },
      gas: BigInt('300000000000000'),
    });
  }

  async function unregister() {
    const { available } = await deployer.viewFunction({
      contractId: fileContract,
      methodName: 'storage_balance_of',
      args: {
        account_id: deployerAccount,
      },
    });

    console.log(`refunding available balance of ${available}`)
    await deployer.functionCall({
      contractId: fileContract,
      methodName: 'storage_withdraw',
      args: {
        amount: available,
      },
      attachedDeposit: 1n,
      gas: BigInt('300000000000000'),
    });

    console.log(`unregistering ${deployerAccount}...`)
    await deployer.functionCall({
      contractId: fileContract,
      methodName: 'storage_unregister',
      args: {},
      attachedDeposit: 1n,
      gas: BigInt('300000000000000'),
    });
  }

  const files = (await listAppFiles()) || [];
  console.log(`[${application}] deleting: ${files.join(', ')}`)
  for (let filename of files) {
    console.log(`deleting ${filename}...`);
    await deleteFile(filename.split('/').slice(2).join('/'));
  }

  if (isLive) {
    await deleteApplication();
    await unregister();
  }
}

deleteApplication().catch((e) => console.error(e));
