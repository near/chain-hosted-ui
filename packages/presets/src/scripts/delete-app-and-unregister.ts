import { deleteApplication, deleteFile, getAccount, listAppFiles, unregister } from './utils';

export async function deleteApplicationAndUnregister() {
  const [,, network, fileContract, deployerAccount, application, appVersion, isLiveRun = true] = process.argv;
  const deployer = getAccount({ accountId: deployerAccount, network });

  const files = (await listAppFiles({ deployer, fileContract, application })) || [];
  console.log(`[${application}] deleting: ${files.join(', ')}`)

  const isLive = isLiveRun === true;
  for (let filename of files) {
    console.log(`deleting ${filename}...`);
    await deleteFile({ deployer, fileContract, application, appVersion: +appVersion, isLive, filename: filename.split('/').slice(2).join('/') });
  }

  if (isLive) {
    await deleteApplication({ application, deployer, fileContract });
    await unregister({ deployer, fileContract });
  }
}

deleteApplicationAndUnregister().catch((e) => console.error(e));
