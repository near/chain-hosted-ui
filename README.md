# Chain Hosted UI

To try it yourself, jump to [Getting Started](#getting-started)

This is a Pagoda experiment for hosting frontends directly on chain. These frontends are built with typical Web2 tooling (e.g. React + Vite + npm dependencies) then the resulting bundles are compressed and stored in the state of a smart contract.

The concept is simple: storage on NEAR is cheap enough that it is feasible to host small apps on chain, especially if some optimization is added to reduce redundant code between deployed dapps. This offers a straightforward path to decentralized hosting as an alternative to, or to complement, static deploy platforms like Github Pages, Vercel, etc.

> Do I need to have an understanding of smart contract development or deployment to use this?

No, a smart contract will be deployed which is able to store and serve bundles for any user. You only need to understand how to sign a transaction (with help from our tooling) and to have enough NEAR tokens to pay for storage.

> How does the cost compare to Web2 hosting solutions?

The cost structure will look very different.

Many web developers are used to starting with free hosting for small apps, since that is widely subsidized by Web2 hosting companies. After that, subscription plans are common.

When deploying on chain, you pay for the storage space of your built+minified+compressed bundles. This means it is more important to pay attention to the size of dependencies you include in your application, as packages that are bloated or do not support proper tree-shaking will directly affect your cost.

NEAR uses storage staking, where NEAR tokens are locked while storage is being used and refundable in the event of deleting that data from smart contract state. The cost of storage is 1 NEAR per 100kb. See specific templates and demos for a clearer idea of bundle sizes and their associated cost.

## Storage Optimization

By building off a provided template with preconfigured code splitting, it is possible to yield separate bundles for the template boilerplate and the custom dapp code. The template boilerplate can be uploaded once then served for every dapp built on that template. This decreases the cost of a deploy to only the custom dapp code + dependencies.

> ⚠️ Storage optimizations are not yet implemented in the current release

## Asset Hosting

There is not yet a specific recommendation for hosting the larger assets a web app may rely on (e.g. images). Leveraging a decentralized storage service would make sense to maintain a fully decentralized deploy.

Until there is tooling to support deploying assets, they should be loaded as remote sources by URL.

## Gateway

A gateway server is necessary to convert browser resource requests to RPC calls. For convenience, gateways may be deployed to cloud hosts, but this causes some centralization. It can be mitigated by having multiple gateways run by different parties. It is important that a user trust the gateway provider however, since the gateway is ultimately what is in control of the experience being served to the user's browser.

A gateway server could also be distributed as a binary to be run locally on a user's machine.

## RPC

An RPC provider services requests for chain data. For resilience, gateways should ideally be capable of falling back to a different provider in the event the primary provider is experiencing degraded service.

## Getting Started

> ℹ️ The current available release is an MVP. Please try it out and let us know how it helps fulfill your use cases!

> ⚠️ The contract has not yet undergone a security audit. Until it does, we advise against depositing large sums of NEAR

At this time, the easiest way to get started is by cloning this repository. Ultimately, the goal is to publish an NPM
package providing bundle configuration and component presets. Until then, new applications may take advantage of the
demo projects in this monorepo while existing applications may be copied over.

The deployment scripts currently only support the keystore utilized by Near JS CLI. This CLI can be used to initialize
keystore credentials for the deployment account (see [near login](https://docs.near.org/tools/near-cli#near-login)
documentation). Alternatively, this may be configured manually by creating a JSON file at the path
`~/.near-credentials/mainnet/DEPLOYER_ACCOUNT.near.json` (replace `mainnet` with `testnet` for testnet) with the
following content:
```json
{
  "account_id":"DEPLOYER_ACCOUNT.near",
  "public_key":"ed25519:44_CHARACTERS_BASE_58",
  "private_key":"ed25519:88_CHARACTERS_BASE_58"
}
```

Also note that in order to do a roll forward deployment, both sets of application files must exist simultaneously to
avoid downtime. Consequently, storage must be paid ahead of each deployment to account for the new files, regardless
of whether the application is already deployed. Once the deployment is live, the files from the previous deployment
are deleted and storage is refunded as part of the deployment script.

### New Projects

New projects may use the `react` or `vue` packages; demo packages preconfigured to produce and deploy applications
using the specified view library. The process is largely the same regardless of the template chosen:

1. Run `pnpm i && pnpm build` at the monorepo project root. 
2. `cd` into the desired template directory (e.g. `cd packages/react`).
3. Configure the `nearDeployConfig` field in `package.json`:
   1. `application` is developer-defined and will be used as part of the URL (names should match `[a-z_-]+`)
   2. `deployerAccount` is your account that pays for bundle storage and calls smart contract methods. This corresponds to the keystore created above (must match `DEPLOYER_ACCOUNT.near`)
   3. `filestoreContract` is the chain-hosted-ui contract (`v1.chain-hosted-ui.testnet` on testnet and `v1.chain-hosted-ui.near` on mainnet, or deployed and configured separately)
4. Add components, content, and/or NPM dependencies to the application.
5. Run `pnpm run deploy` to build the project bundle and deploy the application on chain. You will be presented with the estimated cost to approve before executing the deployment.
6. Load the application at `http://ec2-54-185-81-147.us-west-2.compute.amazonaws.com/FILE_CONTRACT/DEPLOYER_ACCOUNT/APPLICATION-NAME` (with `FILE_CONTRACT` `DEPLOYER_ACCOUNT` and `APPLICATION-NAME` replaced with the values set during step 3)

Once deployed, new deployments can be made or the application can be removed (with any remaining storage being refunded):
- To deploy a new version, run `pnpm run deploy` after making changes. This will increment the application version, delete previous files, and refund any remaining available balance.
- To delete application storage, refund storage-staked Near, and unregister the deployment account, run `pnpm delete-and-unregister`.
- To drop and recreate the application, run `pnpm clean-deploy`.


### Existing Applications

As mentioned above, the recommendation for trying this solution on existing applications is to copy over the source
into this monorepo. For compatibility with the current deployment scripts, there are two bundling requirements that
must be met:
- `rollup-plugin-gzip` is required in bundling to generate the compressed `.gz` files expected by the deployment script.
- `experimental.renderBuiltUrl` must be specified such that on-chain assets are prefixed with the application name. This is required
   for routing to work correctly. E.g. `/assets/a.js` must become `APPLICATION_NAME/assets/a.js` if it's hosted on-chain).

Once the bundling is configured, the next step is to call the `deploy-app` and `delete-app-and-unregister` binaries imported
from `@chain-deployed-ui/presets`. See the [react](./packages/react/package.json) project configuration for example usage.
