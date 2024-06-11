import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
} from "near-sdk-js";

@NearBindgen({})
class StatusMessage {
  filemap: UnorderedMap<Uint8Array>;
  constructor() {
    this.filemap = new UnorderedMap("bin0");
  }

  @call({})
  upload_file({ filename, bytes }: { filename: string, bytes: Uint8Array }) {
    let account_id = near.signerAccountId();
    this.filemap.set(`${near.signerAccountId()}/${filename}`, bytes);
  }

  @view({})
  get_file({ account_id, filename }: { account_id: string, filename: string }) {
    return this.filemap.get(`${account_id}/${filename}`);
  }

  @view({})
  get_all_statuses() {
    // used for test UnorderedMap
    return this.filemap.toArray();
  }

  @call({})
  clear_storage() {
    // used for test UnorderedMap
    this.filemap.clear();
    return 0;
  }
}
