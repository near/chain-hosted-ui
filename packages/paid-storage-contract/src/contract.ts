import {
  Option,
  StorageBalance,
  StorageBalanceBounds,
  StorageManagement,
} from "near-contract-standards/lib";
import {
  AccountId,
  Balance,
  NearBindgen,
  NearPromise,
  StorageUsage,
  assert,
  call,
  initialize,
  near,
  view,
  UnorderedMap,
} from "near-sdk-js";

import { assert_one_yocto } from "./utils";

interface PartitionedFiles {
  [key: string]: number;
}

interface FileSet {
  files: string[];
  storageSize: number;
}

class Application {
  currentVersion: number = 0;
  nextVersion: number | null = null;
  currentFiles: string[] = [];
  nextFiles: string[] = [];
  previousFiles: string[] = [];
}

const BLANK_APPLICATION_BYTES = 65; // includes key prefix; just add app name length

const ACCOUNTS_MAP_PREFIX = "chain-deployed-ui";

@NearBindgen({})
class UserStorage implements StorageManagement {
  accounts: UnorderedMap<StorageBalance>;
  applications: UnorderedMap<Application>;
  filemap: UnorderedMap<number>;
  partitions: UnorderedMap<string>;

  account_storage_usage: StorageUsage;

  constructor() {
    this.accounts = new UnorderedMap(ACCOUNTS_MAP_PREFIX);
    this.account_storage_usage = 0n;
    this.applications = new UnorderedMap("apps");
    this.filemap = new UnorderedMap("pieces");
    this.partitions = new UnorderedMap("parts");
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

    const currentValues = this.accounts.get(account_id);
    if (currentValues) {
      if (registration_only) {
        near.log!("The account is already registered, refunding the deposit");
        NearPromise.new(near.predecessorAccountId()).transfer(amount).build();
      } else {
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
          `The attached deposit is less than the minimum storage balance ${this.storage_balance_bounds().min} yN`
        );
      }

      const availableAmount: Balance = amount - min_balance;
      if (registration_only) {
        this.accounts.set(account_id, new StorageBalance(min_balance, 0n));

        if (availableAmount > 0) {
          NearPromise.new(near.predecessorAccountId()).transfer(
            availableAmount
          ).build();
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

  @call({ payableFunction: true })
  storage_withdraw({ amount }: { amount: Option<bigint> }): StorageBalance {
    if (amount !== null) {
      amount = BigInt(amount);
    }
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

    NearPromise.new(predecessor_account_id).transfer(refund).build();

    return this.accounts.get(predecessor_account_id);
  }

  @call({ payableFunction: true })
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

    NearPromise.new(predecessor_account_id).transfer(storage_balance.total).build();

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
    return this.accounts.get(account_id) || null;
  }

  @view({})
  storage_balance_bounds(): StorageBalanceBounds {
    const min: Balance = this.account_storage_usage * near.storageByteCost();
    const max = null;
    return new StorageBalanceBounds(min, max);
  }

  pay_storage_cost(bytesDiff: bigint) {
    const balance = this.internal_storage_balance_of(near.predecessorAccountId());

    const newBalance = balance.available - (bytesDiff * near.storageByteCost());
    if (newBalance < 0) {
      throw new Error(`insufficient funds, additional ${-newBalance} required`)
    }

    this.accounts.set(near.predecessorAccountId(), new StorageBalance(balance.total, newBalance));
  }

  buildApplicationKey(application: string, account: string) {
    return `${account}/${application}`;
  }

  buildFileKey(application: string, account: string, filename: string, version: number) {
    return `v${version}_${account}/${application}/${filename}`;
  }

  buildFileSet(app: Application | null, files: string[], application: string, account: string, partitionedFiles?: PartitionedFiles) {
    return files.reduce((fileSet: FileSet, f: string) => {
      const file = this.buildFileKey(application, account, f, app?.nextVersion || 1);
      fileSet.storageSize += file.length;
      if (partitionedFiles) {
        fileSet.storageSize += 1 + (partitionedFiles[f] || 1);
      }
      fileSet.files.push(file);
      return fileSet;
    }, { files: [], storageSize: 0 });
  }

  startDeployment({ app, account_id, application, files }: { app: Application, account_id: string, application: string, files: string[] }) {
    app.nextVersion = app.currentVersion + 1;
    const { files: nextFiles } = this.buildFileSet(app, files, application, account_id);
    app.nextFiles = nextFiles;
    this.applications.set(this.buildApplicationKey(application, account_id), app);
  }

  completeDeployment({ app, account_id, application }: { app: Application, account_id: string, application: string }) {
    app.previousFiles = (app?.previousFiles || []).concat(app?.currentFiles || [])
    app.currentFiles = app.nextFiles;
    app.nextFiles = [];
    app.currentVersion = app.nextVersion!;
    app.nextVersion = null;
    this.applications.set(this.buildApplicationKey(application, account_id), app)
  }

  /**
   * Determine cost (in yoctoNear) for storing an application
   */
  @view({})
  calculate_application_storage_cost({ account_id, application, partitionedFiles, fileBytes }: { account_id: string, application: string, partitionedFiles: PartitionedFiles, fileBytes: number }) {
    const appKey = this.buildApplicationKey(application, account_id);
    const app = this.applications.get(appKey);
    const partitionKeyChars = this.buildFileSet(app, Object.keys(partitionedFiles), application, account_id, partitionedFiles).storageSize;
    const fileKeyChars = Object.keys(partitionedFiles).reduce((length, f) => length + this.buildFileKey(application, account_id, f, app?.nextVersion || 1).length, 0);
    let appChars = fileKeyChars + partitionKeyChars + fileBytes;
    if (!app) {
      appChars += BLANK_APPLICATION_BYTES + appKey.length;
    }

    return {
      applicationStorageCost: BigInt(Math.floor(appChars * 1.05)) * near.storageByteCost(),
      breakdown: {
        appKey,
        newAppChars: BLANK_APPLICATION_BYTES + appKey.length,
        fileKeyChars,
        partitionKeyChars,
        fileBytes,
      }
    };
  }

  /**
   * List all file keys
   */
  @view({})
  list_all_files(): string[] {
    // @ts-ignore
    return this.filemap.keys({})
  }

  /**
   * List all partitions
   */
  @view({})
  list_all_partitions(): string[] {
    // @ts-ignore
    return this.partitions.keys({})
  }

  /**
   * List file keys for a given author
   * @param account_id owner of the files
   */
  @view({})
  list_files({ account_id }: { account_id: string }): string[] {
    // @ts-ignore
    return this.filemap.keys({}).filter((k: string) => k.startsWith(account_id));
  }

  /**
   * List application authors
   */
  @view({})
  list_authors(): string[] {
    // @ts-ignore
    return Object.keys(this.filemap.keys({}).reduce((authors: any, file: string) => {
      const versionAuthorTokens = file.split('/')[0].split('_');
      versionAuthorTokens.shift();
      const author = versionAuthorTokens.join('_');
      authors[author] = true;
      return authors;
    }, {}));
  }

  /**
   * List the files for a specified application
   * @param application name of target application
   */
  @view({})
  list_application_files({ account_id, application }: { account_id: string, application: string }): string[] {
    return this.applications.get(`${account_id}/${application}`)?.currentFiles;
  }

  /**
   * Get specified application
   * @param application name of target application
   */
  @view({})
  get_application({ account_id, application }: { account_id: string, application: string }): Application {
    return this.applications.get(`${account_id}/${application}`);
  }

  /**
   * Get the number of partitions for the specified file
   * @param account_id owner of the file
   * @param filename name of the file
   */
  @view({})
  get_parts({ application, account_id, filename }: { account_id: string, application: string, filename: string }): number {
    const app = this.applications.get(`${account_id}/${application}`);
    if (!app) {
      throw new Error(`no application ${account_id}/${application}`);
    }

    const filepath = this.buildFileKey(application, account_id, filename, app.currentVersion);
    const file = app.currentFiles.find((f: string) => f === filepath);
    if (!file) {
      throw new Error(`no match for ${filepath} in [${app.currentFiles.join(',')}]`)
    }
    return this.filemap.get(file)
  }

  /**
   * Get a specific file partition
   * @param account_id owner of the file
   * @param filename name of the file
   * @param part partition index
   */
  @view({})
  get_partition({ application, account_id, filename, part }: { application: string, account_id: string, filename: string, part: number }): string {
    const files = this.applications.get(`${account_id}/${application}`)?.currentFiles || [];
    // @ts-ignore
    const filepath = files.find((f: string) => f.endsWith(filename));
    return this.partitions.get(`${filepath}-${part}`)
  }

  /**
   * Begin application deploy
   * @param application app to which the file belongs
   */
  @call({})
  deploy_application({ application, files }: { application: string, files: string[] }) {
    const startingSize = near.storageUsage();
    const appKey = this.buildApplicationKey(application, near.predecessorAccountId());
    let app = this.applications.get(appKey);
    if (!app) {
      app = new Application();
      this.applications.set(appKey, app);
    }
    this.startDeployment({ app, account_id: near.predecessorAccountId(), application, files });
    const diff = near.storageUsage() - startingSize;
    this.pay_storage_cost(diff);
    return { diff };
  }

  /**
   * Begin application deploy
   * @param application app to which the file belongs
   */
  @call({})
  post_deploy_cleanup({ application }: { application: string }): { files: string[], diff: bigint } {
    const startingSize = near.storageUsage();
    const app = this.applications.get(`${near.predecessorAccountId()}/${application}`)!;
    const files = app.currentFiles;
    this.completeDeployment({ app, account_id: near.predecessorAccountId(), application });
    const diff = near.storageUsage() - startingSize;
    this.pay_storage_cost(diff);
    return { files, diff };
  }

  @call({})
  delete_application({ application }: { application: string }) {
    const startingSize = near.storageUsage();
    this.applications.remove(`${near.predecessorAccountId()}/${application}`)
    const diff = near.storageUsage() - startingSize;
    this.pay_storage_cost(diff);
    return { diff };
  }

  /**
   * Upload a file partition
   * @param application app to which the file belongs
   * @param filename name of the file
   * @param bytes binary file partition data encoded as base64 substring
   * @param part partition index
   * @param totalParts total number of partitions for this file
   */
  @call({})
  upload_file_partition({ application, filename, bytes, part, totalParts }: { application: string, filename: string, bytes: string, part: number, totalParts: number }) {
    const startingSize = near.storageUsage();
    let ret = { filemapDiff: 0n, partitionsDiff: 0n };
    let diff = -1n;
    let error: string | null = null;
    try {
      const app = this.applications.get(`${near.predecessorAccountId()}/${application}`);
      if (!app) {
        // @ts-ignore
        throw new Error(`no application ${near.predecessorAccountId()}/${application} - call the "deploy_application" method before uploading file partitions`);
      }

      const fileKey = this.buildFileKey(application, near.predecessorAccountId(), filename, app.nextVersion);
      if (!this.filemap.get(fileKey)) {
        this.filemap.set(fileKey, totalParts);
        ret.filemapDiff = near.storageUsage() - startingSize;
      }

      this.partitions.set(`${fileKey}-${part}`, bytes);
      diff = near.storageUsage() - startingSize;
      ret.partitionsDiff = diff - ret.filemapDiff;
      this.pay_storage_cost(diff);
    } catch (e) {
      if (diff < 0n) {
        diff = near.storageUsage() - startingSize;
      }
      error = e.toString()
    }

    return { diff, error, ...ret };
  }

  /**
   * Delete all entries for the specified file
   * @param filename name of the file
   */
  @call({})
  delete_file({ application, filepath, partsToDelete }: { application: string, filepath: string, partsToDelete?: number }): { remainingParts: number, diff: bigint } {
    const startingSize = near.storageUsage();
    const fileOwner = filepath.split('_').slice(1).join('_').split('/')[0];
    if (near.predecessorAccountId() !== fileOwner) {
      throw Error(`${near.predecessorAccountId()} cannot delete file ${filepath} owned by ${fileOwner}`);
    }

    const parts = this.filemap.get(filepath);
    if (parts === null) {
      return { remainingParts: -1, diff: 0n }
    }

    const MAX_PARTS = 3;
    const isPartialDelete = parts > (partsToDelete || MAX_PARTS);
    let i = parts;
    while (i >= (isPartialDelete ? parts - (partsToDelete || MAX_PARTS) : 0)) {
      this.partitions.remove(`${filepath}-${--i}`);
    }

    const remainingParts = i + 1;
    if (!isPartialDelete) {
      this.filemap.remove(filepath);
      const appKey = this.buildApplicationKey(application, near.predecessorAccountId());
      const app = this.applications.get(appKey);
      if (app) {
        app.previousFiles = app.previousFiles.filter((f) => f !== filepath);
        this.applications.set(appKey, app);
      }
    } else {
      this.filemap.set(filepath, remainingParts);
    }

    const diff = near.storageUsage() - startingSize;
    this.pay_storage_cost(diff);
    return { remainingParts, diff }
  }

  /**
   * List all existing accounts
   */
  @view({})
  list_all_accounts(): { [key: string]: StorageBalance } {
    // @ts-ignore
    const keys: string[] = this.accounts.keys({});
    const result: { [key: string]: StorageBalance } = {};
    for (const key of keys) {
      result[key] = this.accounts.get(key) || new StorageBalance(0n, 0n);
    }

    return result;
  }
}
