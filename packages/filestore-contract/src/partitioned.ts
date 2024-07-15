import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
} from "near-sdk-js";

class Application {
  currentVersion: number = 0;
  nextVersion: number | null = null;
  currentFiles: string[] = [];
  nextFiles: string[] = [];
  previousFiles: string[] = [];
}

@NearBindgen({})
class StatusMessage {
  applications: UnorderedMap<Application>;
  filemap: UnorderedMap<number>;
  partitions: UnorderedMap<string>;
  constructor() {
    this.applications = new UnorderedMap("apps");
    this.filemap = new UnorderedMap("pieces");
    this.partitions = new UnorderedMap("parts");
  }

  buildApplicationKey(application: string, account: string, ) {}

  startDeployment({ app, account_id, application, files }: { app: Application, account_id: string, application: string, files: string[] }) {
    app.nextVersion = app.currentVersion + 1;
    // @ts-ignore
    app.nextFiles = files.map((f: string) => `v${app.nextVersion}_${f}`);
    this.applications.set(`${account_id}/${application}`, app);
  }

  completeDeployment({ app, account_id, application }: { app: Application, account_id: string, application: string }) {
    // @ts-ignore
    app.previousFiles = (app?.previousFiles || []).concat(app?.currentFiles || [])
    app.currentFiles = app.nextFiles;
    app.nextFiles = [];
    app.currentVersion = app.nextVersion!;
    app.nextVersion = null;
    this.applications.set(`${account_id}/${application}`, app)
  }

  completeFileUpload({ account_id, application, filename }: { account_id: string, application: string, filename: string }) {
    const app = this.applications.get(`${account_id}/${application}`);
    // @ts-ignore
    app.nextFiles = app.nextFiles.filter((f: string) => f === filename);
    this.applications.set(application, app);
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
      // @ts-ignore
      authors[file.split('/')[0]] = true;
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

    const filepath = `v${app.currentVersion}_${account_id}/${application}/${filename}`;
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
    const appKey = `${near.signerAccountId()}/${application}`
    let app = this.applications.get(appKey);
    if (!app) {
      app = new Application();
      this.applications.set(appKey, app);
    }
    this.startDeployment({ app, account_id: near.signerAccountId(), application, files });
  }

  /**
   * Begin application deploy
   * @param application app to which the file belongs
   */
  @call({})
  post_deploy_cleanup({ application }: { application: string }): string[] {
    const app = this.applications.get(`${near.signerAccountId()}/${application}`)!;
    const files = app.currentFiles;
    this.completeDeployment({ app, account_id: near.signerAccountId(), application });
    return files;
  }

  @call({})
  delete_application({ account_id, application }: { account_id: string, application: string }) {
    this.applications.remove(`${account_id}/${application}`)
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
    const app = this.applications.get(`${near.signerAccountId()}/${application}`);
    if (!app) {
      // @ts-ignore
      throw new Error(`no application ${near.signerAccountId()}/${application} - call the "deploy_application" method before uploading file partitions`);
    }

    const fileKey = `v${app.nextVersion}_${near.signerAccountId()}/${application}/${filename}`;
    if (!this.filemap.get(fileKey)) {
      this.filemap.set(fileKey, totalParts);
    }

    this.partitions.set(`${fileKey}-${part}`, bytes);
    if (part === totalParts) {
      this.completeFileUpload({ account_id: near.signerAccountId(), application, filename });
    }
  }


  /**
   * Delete all entries for the specified file
   * @param filename name of the file
   */
  @call({})
  delete_file({ appVersion, application, filename, partsToDelete }: { appVersion: string, application: string, filename: string, partsToDelete?: number }): { remainingParts: number } {
    const fileKey = `v${appVersion}_${near.signerAccountId()}/${application}/${filename}`;
    const parts = this.filemap.get(fileKey);
    if (parts === null) {
      return { remainingParts: -1 }
    }

    const MAX_PARTS = 3;
    const isPartialDelete = parts > (partsToDelete || MAX_PARTS);
    let i = parts;
    while (i >= (isPartialDelete ? parts - (partsToDelete || MAX_PARTS) : 0)) {
      this.partitions.remove(`${fileKey}-${--i}`);
    }

    const remainingParts = i + 1;
    if (!isPartialDelete) {
      this.filemap.remove(fileKey);
    } else {
      this.filemap.set(fileKey, remainingParts);
    }

    return { remainingParts }
  }
}
