import {
  Option,
  StorageBalance,
  StorageBalanceBounds,
  StorageManagement,
} from "near-contract-standards/lib";
import {
  AccountId,
  Balance,
  LookupMap,
  NearBindgen,
  NearPromise,
  StorageUsage,
  assert,
  call,
  initialize,
  near,
  view,
} from "near-sdk-js";

import { assert_one_yocto } from "./utils";

const ACCOUNTS_MAP_PREFIX = "chain-deployed-ui";

@NearBindgen({})
class UserStorage implements StorageManagement {
  accounts: LookupMap<StorageBalance>;

  account_storage_usage: StorageUsage;

  constructor() {
    this.accounts = new LookupMap(ACCOUNTS_MAP_PREFIX);
    this.account_storage_usage = 0n;
  }

  @initialize({ privateFunction: true })
  init() {
    this.measure_account_storage_usage();
    return this;
  }

  measure_account_storage_usage() {
    let initial_storage_usage: bigint = near.storageUsage();
    let tmp_account_id: string = "a".repeat(64);
    this.accounts.set(tmp_account_id, new StorageBalance(0n, 0n));
    this.account_storage_usage = near.storageUsage() - initial_storage_usage;
    this.accounts.remove(tmp_account_id);
  }

  @call({ payableFunction: true })
  storage_deposit({
    account_id,
    registration_only,
  }: {
    account_id: Option<AccountId>;
    registration_only: Option<boolean>;
  }): StorageBalance {
    const amount: Balance = near.attachedDeposit();
    account_id = account_id ?? near.predecessorAccountId();

    assert(amount > 0, "Deposit amount must be greater than zero");

    if (this.accounts.containsKey(account_id)) {
      if (registration_only) {
        near.log!("The account is already registered, refunding the deposit");
        NearPromise.new(near.predecessorAccountId()).transfer(amount);
      } else {
        const currentValues = this.accounts.get(account_id);
        this.accounts.set(
          account_id,
          new StorageBalance(
            currentValues.total + amount,
            currentValues.available + amount
          )
        );
      }
    } else {
      let min_balance: Balance = this.storage_balance_bounds().min;
      if (amount < min_balance) {
        throw Error(
          "The attached deposit is less than the minimum storage balance"
        );
      }

      const availableAmount: Balance = amount - min_balance;
      if (registration_only) {
        this.accounts.set(account_id, new StorageBalance(min_balance, 0n));

        if (availableAmount > 0) {
          NearPromise.new(near.predecessorAccountId()).transfer(
            availableAmount
          );
        }
      } else {
        this.accounts.set(
          account_id,
          new StorageBalance(amount, availableAmount)
        );
      }
    }

    return this.accounts.get(account_id);
  }

  @call({})
  storage_withdraw({ amount }: { amount: Option<bigint> }): StorageBalance {
    amount = BigInt(amount);
    assert_one_yocto();

    const predecessor_account_id = near.predecessorAccountId();

    const storage_balance = this.internal_storage_balance_of(
      predecessor_account_id
    );

    if (!storage_balance) {
      throw Error(`The account ${predecessor_account_id} is not registered`);
    }

    if (amount > storage_balance.available) {
      throw Error("The amount is greater than the available storage balance");
    }

    const refund = amount || storage_balance.available;

    this.accounts.set(
      predecessor_account_id,
      new StorageBalance(
        storage_balance.total - refund,
        storage_balance.available - refund
      )
    );

    NearPromise.new(predecessor_account_id).transfer(refund);

    return this.accounts.get(predecessor_account_id);
  }

  storage_unregister({ force }: { force: boolean }): boolean {
    assert_one_yocto();
    const predecessor_account_id = near.predecessorAccountId();

    const storage_balance = this.internal_storage_balance_of(
      predecessor_account_id
    );

    if (!storage_balance) {
      return false;
    }

    if (storage_balance.available && !force) {
      throw Error(
        `The account ${predecessor_account_id} has available balance!`
      );
    }

    this.accounts.remove(predecessor_account_id);

    NearPromise.new(predecessor_account_id).transfer(storage_balance.total);

    return true;
  }

  @view({})
  storage_balance_of({
    account_id,
  }: {
    account_id: AccountId;
  }): StorageBalance {
    return this.accounts.get(account_id);
  }

  internal_storage_balance_of(account_id: AccountId): Option<StorageBalance> {
    if (this.accounts.containsKey(account_id)) {
      return this.accounts.get(account_id);
    } else {
      return null;
    }
  }

  @view({})
  storage_balance_bounds(): StorageBalanceBounds {
    const min: Balance = this.account_storage_usage * near.storageByteCost();
    const max = null;
    return new StorageBalanceBounds(min, max);
  }
}