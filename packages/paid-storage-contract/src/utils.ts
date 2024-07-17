import { assert, near } from "near-sdk-js";

/** Assert that exactly 1 yoctoNEAR was attached */
export function assert_one_yocto(): void {
  assert(
    near.attachedDeposit() === 1n,
    "Requires attached deposit of 1 yoctoNEAR"
  );
}
