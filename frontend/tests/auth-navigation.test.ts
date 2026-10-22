import { test } from "node:test";
import assert from "node:assert/strict";
import { safeChallengeDestination } from "../lib/auth-navigation";
test("authentication preserves known challenge destinations", () =>
  assert.equal(
    safeChallengeDestination("/portal/challenges/payment_xlm_003"),
    "/portal/challenges/payment_xlm_003",
  ));
test("authentication rejects external, unknown and malformed destinations", () => {
  for (const value of [
    null,
    "https://example.com",
    "//example.com",
    "/portal/challenges/unknown",
    "/portal/challenges/payment_xlm_003?next=https://example.com",
  ])
    assert.equal(safeChallengeDestination(value), null);
});
