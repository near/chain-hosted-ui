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
  delete_file({ filename }: { filename: string }) {
    const fileKey = `${near.signerAccountId()}/${filename}`;
    const parts = this.filemap.get(fileKey);
    let i = 0;
    while (i < parts) {
      this.partitions.remove(`${fileKey}-${i++}`);
    }
    this.filemap.remove(fileKey);
  }
}
