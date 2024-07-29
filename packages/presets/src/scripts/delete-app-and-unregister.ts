import { deleteApplication, deleteFile, getAccount, listAppFiles, unregister, withdrawAvailableBalance } from './utils';

export async function deleteApplicationAndUnregister() {
  const [,, network, fileContract, deployerAccount, application, isLiveRun = true] = process.argv;
  const deployer = getAccount({ accountId: deployerAccount, network });

  const files = (await listAppFiles({ deployer, fileContract, application })) || [];
  console.log(`[${application}] deleting: ${files.join(', ')}`)

  const isLive = isLiveRun === true;
  for (let filepath of files) {
    console.log(`deleting ${filepath}...`);
    await deleteFile({ deployer, application, fileContract, isLive, filepath });
  }

  if (isLive) {
    await deleteApplication({ application, deployer, fileContract });
    await withdrawAvailableBalance({ deployer, fileContract });
    await unregister({ deployer, fileContract });
  }
}

deleteApplicationAndUnregister().catch((e) => console.error(e));
