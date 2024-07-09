export type StorageBalance = {
  total: bigint;
  available: bigint;
};

export type StorageBalanceBounds = {
  min: bigint;
  max: bigint | null;
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
    registration_only: boolean | null,
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
