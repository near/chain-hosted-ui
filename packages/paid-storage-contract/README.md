# Paid storage NEAR Contract

The smart contract exposes a few methods to enable registering an account, depositing, withdrawing.

# Quickstart

1. Make sure you have installed [node.js](https://nodejs.org/en/download/package-manager/) >= 16.
2. Install the [`NEAR CLI`](https://github.com/near/near-cli#setup)

<br />

## 1. Build and Test the Contract
You can automatically compile and test the contract by running:

```bash
npm run build
```

<br />

## 2. Create an Account and Deploy the Contract
You can create a new account and deploy the contract by running:

```bash
near create-account <your-account.testnet> --useFaucet
near deploy <your-account.testnet> build/paid_storage_contract.wasm --initFunction init --initArgs '{}'
```

<br />

## 3. Register an account and deposit upfront

`storage_deposit` changes the contract's state, for which it is a `call` method.

`Call` methods can only be invoked using a NEAR account, since the account needs to pay GAS for the transaction.

```bash
# Use near-cli to get the greeting
near view <your-account.testnet> storage_deposit --accountId <your-account.testnet> --amount <your-deposit-amount>
```

<br />

**Tip:** If you would like to call `storage_deposit` using another account, first login into NEAR using:

```bash
# Use near-cli to login your NEAR account
near login
```

and then use the logged account to sign the transaction: `--accountId <another-account>`.