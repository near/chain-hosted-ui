import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  calculateApplicationDeploymentCost,
  deployApplication,
  getApplication,
  depositDeploymentStorageCost,
  getAccount, PARTITION_SIZE, postDeployCleanup, uploadFile, withdrawAvailableBalance, deleteFiles,
} from './utils';
import { formatNearAmount } from '@near-js/utils';

interface BundleAsset {
  contentPath: string;
  fileContents: string;
  filename: string;
  partitions: number;
}

function aggregateBundle(deployerAccount: string, application: string, basePath: string) {
  const distPath = path.resolve(process.env.PWD as string, basePath);
  return fs.readdirSync(distPath, { recursive: true })
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
}

export async function deployApp() {
  const [,, basePath, network, fileContract, deployerAccount, application, isLiveRun = true] = process.argv;
  const deployer = getAccount({ accountId: deployerAccount, network });

  const { files, aggregated: { totalBytes, totalPartitions } } = aggregateBundle(deployerAccount, application, basePath);
  const { applicationStorageCost, breakdown } = await calculateApplicationDeploymentCost({ deployer, application, files, totalBytes, fileContract });

  console.log(`${application} deployment calculated to cost ${formatNearAmount(applicationStorageCost)} N`, breakdown)

  const isLive = isLiveRun === true;
  if (isLive) {
    await depositDeploymentStorageCost({ deployer, fileContract, applicationStorageCost })
    const deployResult = await deployApplication({ deployer, fileContract, application, files: files.map(({ filename }) => filename) })
    console.log({ deployResult })
  }

  for (let { contentPath, fileContents, filename, partitions } of files) {
    console.log(`[${contentPath}] uploading in ${partitions} parts... (${filename})`)
    await uploadFile({ deployer, fileContract, fileContents, filename, partitions, isLive, application });
  }

  console.log(`all files uploaded for ${application}, beginning post-deploy actions`)
  if (isLive) {
    const cleanupResult = await postDeployCleanup({ deployer, fileContract, application });
    console.log('deployment completed', { cleanupResult });

    await deleteFiles({ deployer, fileContract, application, isLive })

    await withdrawAvailableBalance({ deployer, fileContract });
  }
}

deployApp().catch((e) => console.error(e));
