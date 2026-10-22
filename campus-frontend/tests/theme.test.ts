import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseTheme } from "../lib/theme";

test("an explicit light preference overrides a dark system theme", () =>
  assert.equal(chooseTheme("light", true), "light"));
test("an explicit dark preference overrides a light system theme", () =>
  assert.equal(chooseTheme("dark", false), "dark"));
test("a new visitor follows their system appearance", () => {
  assert.equal(chooseTheme(null, true), "dark");
  assert.equal(chooseTheme(null, false), "light");
});
test("invalid saved preferences fall back to the system", () => {
  assert.equal(chooseTheme("invalid", false), "light");
  assert.equal(chooseTheme("", true), "dark");
});
