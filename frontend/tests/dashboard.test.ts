import { test } from "node:test";
import assert from "node:assert/strict";
import {
  challengeState,
  chooseNextChallenge,
  categoryProgress,
} from "../lib/dashboard";
import type { LiveChallenge, LiveSubmission } from "../lib/api/student";
const challenges: LiveChallenge[] = [
  {
    id: "wallet_verify_001",
    title: "Wallet",
    description: "",
    category: "Wallet & Account",
    difficulty: "Beginner",
    network: "testnet",
    status: "COMPLETED",
  },
  {
    id: "payment_xlm_003",
    title: "Payment",
    description: "",
    category: "Stellar Payments",
    difficulty: "Intermediate",
    network: "testnet",
    status: "AVAILABLE",
  },
];
const failed: LiveSubmission = {
  id: "s1",
  challenge_id: "payment_xlm_003",
  challenge_title: "Payment",
  status: "FAILED",
  created_at: "2026-10-21T10:00:00Z",
};
test("verified challenge stays verified after a failed retry", () =>
  assert.equal(
    challengeState({ ...challenges[1], status: "COMPLETED" }, [failed]),
    "VERIFIED",
  ));
test("continuation selects an uncompleted failed challenge from real history", () =>
  assert.equal(
    chooseNextChallenge(challenges, [failed])?.id,
    "payment_xlm_003",
  ));
test("all-complete catalog has no invented continuation task", () =>
  assert.equal(
    chooseNextChallenge(
      challenges.map((c) => ({ ...c, status: "COMPLETED" })),
      [failed],
    ),
    null,
  ));
test("category progress uses catalog completion, not submission attempts", () =>
  assert.deepEqual(categoryProgress(challenges), [
    { category: "Wallet & Account", verified: 1, total: 1 },
    { category: "Stellar Payments", verified: 0, total: 1 },
  ]));
