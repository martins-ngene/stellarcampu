import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowWelcome } from "../lib/welcome";
test("new visitors and invalid preferences see the intro", () => {
  assert.equal(shouldShowWelcome(null), true);
  assert.equal(shouldShowWelcome("invalid"), true);
});
test("completed visitors return directly to the landing page", () =>
  assert.equal(shouldShowWelcome("complete"), false));
