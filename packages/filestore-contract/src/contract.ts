import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
} from "near-sdk-js";

@NearBindgen({})
class StatusMessage {
  filemap: UnorderedMap<string>;
  constructor() {
    this.filemap = new UnorderedMap("a1");
  }

  @call({})
  upload_file({ filename, bytes }: { filename: string, bytes: string }) {
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
}
