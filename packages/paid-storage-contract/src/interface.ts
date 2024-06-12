// ! DO NOT USE, THIS WAS CREATED BEFORE FINDING near-contract-standards PACKAGE


// original: https://github.com/near/NEPs/blob/master/neps/nep-0145.md#interface
// converted to TS interface syntax for direct consumption

/**
 * The structure that will be returned for the methods:
 * * `storage_deposit`
 * * `storage_withdraw`
 * * `storage_balance_of`
 * The `total` and `available` values are string representations of unsigned
 * 128-bit integers showing the balance of a specific account in yoctoⓃ.
 */
export type StorageBalance = {
  total: string;
  available: string;
};

/**
 * The below structure will be returned for the method `storage_balance_bounds`.
 * Both `min` and `max` are string representations of unsigned 128-bit integers.
 *
 * `min` is the amount of tokens required to start using this contract at all
 * (eg to register with the contract). If a new contract user attaches `min`
 * NEAR to a `storage_deposit` call, subsequent calls to `storage_balance_of`
 * for this user must show their `total` equal to `min` and `available=0` .
 *
 * A contract may implement `max` equal to `min` if it only charges for initial
 * registration, and does not adjust per-user storage over time. A contract
 * which implements `max` must refund deposits that would increase a user's
 * storage balance beyond this amount.
 */
export type StorageBalanceBounds = {
  min: string;
  max: string | null;
};

export interface NEP_0145 {

  /************************************/
  /* CHANGE METHODS on fungible token */
  /************************************/
  /**
   * Payable method that receives an attached deposit of Ⓝ for a given account.
   *
   * If `account_id` is omitted, the deposit MUST go toward predecessor account.
   * If provided, deposit MUST go toward this account. If invalid, contract MUST
   * panic.
   *
   * If `registration_only=true`, contract MUST refund above the minimum balance
   * if the account wasn't registered and refund full deposit if already
   * registered.
   *
   * The `storage_balance_of.total` + `attached_deposit` in excess of
   * `storage_balance_bounds.max` must be refunded to predecessor account.
   *
   * Returns the StorageBalance structure showing updated balances.
   */
  storage_deposit(
    account_id: string | null,
    registration_only: boolean | null
  ): StorageBalance;

  /**
   * Withdraw specified amount of available Ⓝ for predecessor account.
   *
   * This method is safe to call. It MUST NOT remove data.
   *
   * `amount` is sent as a string representing an unsigned 128-bit integer. If
   * omitted, contract MUST refund full `available` balance. If `amount` exceeds
   * predecessor account's available balance, contract MUST panic.
   *
   * If predecessor account not registered, contract MUST panic.
   *
   * MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
   * function-call access-key call (UX wallet security)
   *
   * Returns the StorageBalance structure showing updated balances.
  */
  storage_withdraw(amount: string | null): StorageBalance;

  /**
   * Unregisters the predecessor account and returns the storage NEAR deposit.
   *
   * If the predecessor account is not registered, the function MUST return
   * `false` without panic.
   *
   * If `force=true` the function SHOULD ignore existing account data, such as
   * non-zero balances on an FT contract (that is, it should burn such balances),
   * and close the account. Contract MAY panic if it doesn't support forced
   * unregistration, or if it can't force unregister for the particular situation
   * (example: too much data to delete at once).
   *
   * If `force=false` or `force` is omitted, the contract MUST panic if caller
   * has existing account data, such as a positive registered balance (eg token
   * holdings).
   *
   * MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
   * function-call access-key call (UX wallet security)
   *
   * Returns `true` iff the account was successfully unregistered.
   * Returns `false` iff account was not registered before.
  */
  storage_unregister(force: boolean | null): boolean;

  /****************/
  /* VIEW METHODS */
  /****************/
  /**
   * Returns minimum and maximum allowed balance amounts to interact with this
   * contract. See StorageBalanceBounds.
  */
  storage_balance_bounds(): StorageBalanceBounds;

  /**
   * Returns the StorageBalance structure of the valid `account_id`
   * provided. Must panic if `account_id` is invalid.
   *
   * If `account_id` is not registered, must return `null`.
  */
  storage_balance_of(account_id: string): StorageBalance | null;

}