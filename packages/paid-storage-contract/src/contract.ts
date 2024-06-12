// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view } from 'near-sdk-js';
import { StorageBalance, StorageBalanceBounds, StorageManagement } from 'near-contract-standards/lib';

@NearBindgen({})
class UserStorage implements StorageManagement {
  storage_deposit({ account_id, registration_only }: { account_id: string; registration_only: boolean; }): StorageBalance {
    throw new Error('Method not implemented.');
  }
  storage_withdraw({ amount }: { amount?: bigint; }): StorageBalance {
    throw new Error('Method not implemented.');
  }
  storage_unregister({ force }: { force: boolean; }): boolean {
    throw new Error('Method not implemented.');
  }
  storage_balance_bounds(): StorageBalanceBounds {
    throw new Error('Method not implemented.');
  }
  storage_balance_of({ account_id }: { account_id: string; }): StorageBalance {
    throw new Error('Method not implemented.');
  }

  // -----------------------------------------------------------------
  // Original contract example code
  // greeting: string = 'Hello';

  // @view({}) // This method is read-only and can be called for free
  // get_greeting(): string {
  //   return this.greeting;
  // }

  // @call({}) // This method changes the state, for which it cost gas
  // set_greeting({ greeting }: { greeting: string }): void {
  //   near.log(`Saving greeting ${greeting}`);
  //   this.greeting = greeting;
  // }

}