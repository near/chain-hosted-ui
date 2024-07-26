import anyTest from "ava";
import { Worker } from "near-workspaces";
import { setDefaultResultOrder } from "dns";
setDefaultResultOrder("ipv4first"); // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;

test.beforeEach(async (t) => {
  // Create sandbox
  const worker = (t.context.worker = await Worker.init());

  // Deploy contract
  const root = worker.rootAccount;
  const contract = await root.createSubAccount("test-account");

  // Get wasm file path from package.json test script in folder above
  await contract.deploy(process.argv[2]);
  await contract.call(contract, "init", {});

  // Save state for test runs, it is unique for each test
  t.context.accounts = { root, contract };
});

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log("Failed to stop the Sandbox:", error);
  });
});

// test('returns the default greeting', async (t) => {
//   const { contract } = t.context.accounts;
//   const greeting = await contract.view('get_greeting', {});
//   t.is(greeting, 'Hello');
// });

// test('changes the greeting', async (t) => {
//   const { root, contract } = t.context.accounts;
//   await root.call(contract, 'set_greeting', { greeting: 'Howdy' });
//   const greeting = await contract.view('get_greeting', {});
//   t.is(greeting, 'Howdy');
// });

test("returns storage balance bounds", async (t) => {
  const { contract } = t.context.accounts;
  const { min, max } = await contract.view("storage_balance_bounds", {});
  t.assert(typeof min === "string", "min must be a string");
  t.truthy(min, "min must be non-empty");
  t.assert(
    typeof max === "string" || max === null,
    "max must be a string or null"
  );
  if (typeof max === "string") {
    t.truthy(max, "max must be non-empty");
  }
});

test("adds storage balance for new user", async (t) => {
  const { root, contract } = t.context.accounts;
  const user = await root.createSubAccount("new-user");

  const deposit = "1000000000000000000000000";
  await user.call(
    contract,
    "storage_deposit",
    { account_id: user.accountId },
    {
      attachedDeposit: deposit,
    }
  );
  const { total, available } = await contract.view("storage_balance_of", {
    account_id: user.accountId,
  });
  const { min } = await contract.view("storage_balance_bounds", {});
  t.is(total, deposit);
  t.is(available, (BigInt(deposit) - BigInt(min)).toString());
});

// storag_withdraw will amount=null refunds full available balance
test("storage_withdraw with amount=null sets available=0", async (t) => {
  const { root, contract } = t.context.accounts;
  const user = await root.createSubAccount("new-user");
  const checkBalances = partial(checkStorageBalances, contract, user);

  // checkBalances("Start");

  await user.call(
    contract,
    "storage_deposit",
    { account_id: user.accountId },
    {
      attachedDeposit: "5000000000000000000000000",
    }
  );

  // checkBalances("Deposited");

  await user.call(
    contract,
    "storage_withdraw",
    { amount: null },
    {
      attachedDeposit: "1",
    }
  );

  const { available } = await checkBalances("Withdrawn");

  t.is(available, "0");
});

// ! DISABLED since gas tokens burnt is not adding up to balance lost
test.skip("storage_withdraw returns balance to user", async (t) => {
  const { root, contract } = t.context.accounts;
  const user = await root.createSubAccount("new-user");
  const checkBalances = partial(checkStorageBalances, contract, user);

  const { balance: startingBalance } = await checkBalances("Start");

  let gasTokensBurnt = 0n;

  const res1 = await user.callRaw(
    contract,
    "storage_deposit",
    { account_id: user.accountId },
    {
      attachedDeposit: "5000000000000000000000000",
    }
  );

  gasTokensBurnt += BigInt(
    res1.result.transaction_outcome.outcome.tokens_burnt
  );

  checkBalances("Deposited");

  const res2 = await user.callRaw(
    contract,
    "storage_withdraw",
    { amount: null },
    {
      attachedDeposit: "1",
    }
  );

  gasTokensBurnt += BigInt(
    res2.result.transaction_outcome.outcome.tokens_burnt
  );

  const {
    available,
    balance: endingBalance,
    total: endingTotal,
  } = await checkBalances("Withdrawn");

  console.log("gas tokens burnt var:", gasTokensBurnt.toString());
  console.log(
    "actual diff from gas:",
    (
      BigInt(startingBalance) -
      BigInt(endingTotal) -
      BigInt(endingBalance)
    ).toString()
  );

  t.is(available, "0");
  t.is(
    endingBalance,
    (BigInt(startingBalance) - BigInt(endingTotal) - gasTokensBurnt).toString()
  );
});

// check that total after withdraw is equal to minimum storage balance
test("withdraws storage balance to minimum", async (t) => {
  const { root, contract } = t.context.accounts;
  const user = await root.createSubAccount("new-user");
  const checkBalances = partial(checkStorageBalances, contract, user);

  checkBalances("Start");

  await user.call(
    contract,
    "storage_deposit",
    { account_id: user.accountId },
    {
      attachedDeposit: "5000000000000000000000000",
    }
  );

  checkBalances("Deposited");

  await user.call(
    contract,
    "storage_withdraw",
    { amount: null },
    {
      attachedDeposit: "1",
    }
  );

  const { total } = await checkBalances("Withdrawn");

  const { min } = await contract.view("storage_balance_bounds", {});

  t.is(total, min);
});

/**
 *
 * @param {NearAccount} contract
 * @param {NearAccount} user
 * @param {string} title
 */
async function checkStorageBalances(contract, user, title) {
  // print args to console
  console.log(title);
  console.log(contract.accountId);
  console.log(user.accountId);

  const { total, available } =
    (await contract.view("storage_balance_of", {
      account_id: user.accountId,
    })) ?? {};
  const balance = (await user.availableBalance()).toString();
  console.log(`${title} (${user.accountId})`);
  console.table({ total, available, balance });
  return { total, available, balance };
}

function partial(fn, ...args) {
  return (...args2) => fn(...args, ...args2);
}
