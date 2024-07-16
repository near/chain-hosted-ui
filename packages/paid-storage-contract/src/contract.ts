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
  ONE_NEAR,
  assert,
  call,
  near,
  view,
} from "near-sdk-js";

import { assert_one_yocto } from "./utils";

const ACCOUNTS_MAP_PREFIX = "chain-deployed-ui";

@NearBindgen({})
class UserStorage implements StorageManagement {
  accounts: LookupMap<StorageBalance>;

  constructor() {
    this.accounts = new LookupMap(ACCOUNTS_MAP_PREFIX);
  }

  @call({ payableFunction: true })
  storage_deposit({
    account_id,
    registration_only,
  }: {
    account_id?: AccountId;
    registration_only?: boolean;
  }): StorageBalance {
    const amount: Balance = near.attachedDeposit();
    account_id = account_id ?? near.predecessorAccountId();

    assert(amount > 0, "Deposit amount must be greater than zero");

    if (!this.accounts.containsKey(account_id)) {
      this.accounts.set(account_id, { total: 0n, available: 0n });
    }

    if (registration_only) {
      // TODO - spend on the account creation and refund the rest
    } else {
      const currentValues = this.accounts.get(account_id);
      const incrementAmount = amount; // TODO - deduct the account creation if was any
      this.accounts.set(account_id, {
        total: currentValues.total + incrementAmount,
        available: currentValues.available + incrementAmount,
      });
    }

    return this.accounts.get(account_id);
  }

  @call({})
  storage_withdraw({ amount }: { amount?: bigint }): StorageBalance {
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

    if (amount) {
      this.accounts.set(
        predecessor_account_id,
        new StorageBalance(
          storage_balance.total - amount,
          storage_balance.available - amount
        )
      );
    } else {
      this.accounts.remove(predecessor_account_id);
    }

    NearPromise.new(predecessor_account_id).transfer(
      amount || storage_balance.available
    );

    return this.accounts.get(predecessor_account_id);
  }

  storage_unregister({ force }: { force: boolean }): boolean {
    // TODO - handle the force = true case
    assert_one_yocto();
    const predecessor_account_id = near.predecessorAccountId();

    const storage_balance = this.internal_storage_balance_of(
      predecessor_account_id
    );

    if (!storage_balance) {
      return false;
    }

    if (storage_balance.available) {
      NearPromise.new(predecessor_account_id).transfer(
        storage_balance.available
      );
    }

    this.accounts.remove(predecessor_account_id);

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
    const min = BigInt(Math.round(0.001 * Number(ONE_NEAR))); // 0.001 NEAR as an example minimum
    const max = null;
    return new StorageBalanceBounds(min, max);
  }
}
