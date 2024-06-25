import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
} from "near-sdk-js";

@NearBindgen({})
class StatusMessage {
  filemap: UnorderedMap<number>;
  partitions: UnorderedMap<string>;
  constructor() {
    this.filemap = new UnorderedMap("pieces");
    this.partitions = new UnorderedMap("parts");
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
   * Get the number of partitions for the specified file
   * @param account_id owner of the file
   * @param filename name of the file
   */
  @view({})
  get_parts({ account_id, filename }: { account_id: string, filename: string }): number {
    return this.filemap.get(`${account_id}/${filename}`)
  }

  /**
   * Get a specific file partition
   * @param account_id owner of the file
   * @param filename name of the file
   * @param part partition index
   */
  @view({})
  get_partition({ account_id, filename, part }: { account_id: string, filename: string, part: number }): string {
    return this.partitions.get(`${account_id}/${filename}-${part}`)
  }

  /**
   * Get a specific file partition
   * @param account_id owner of the file
   * @param filename name of the file
   * @param part partition index
   * @param totalParts total number of partitions for this file
   */
  @call({})
  upload_file({ filename, bytes, part, totalParts }: { filename: string, bytes: string, part: number, totalParts: number }) {
    const fileKey = `${near.signerAccountId()}/${filename}`;
    if (!this.filemap.get(fileKey)) {
      this.filemap.set(fileKey, totalParts);
    }
    this.partitions.set(`${fileKey}-${part}`, bytes);
  }


  /**
   * Delete all entries for the specified file
   * @param filename name of the file
   */
  @call({})
  delete_file({ filename, partsToDelete }: { filename: string, partsToDelete?: number }): { remainingParts: number } {
    const fileKey = `${near.signerAccountId()}/${filename}`;
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
