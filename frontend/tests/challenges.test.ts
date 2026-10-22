import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAssignment,
  submissionBody,
  normalizeResult,
} from "../lib/api/challenges";
const assignment = {
  assignmentId: "c20904d0-a337-4ec0-9749-399a0cb96123",
  challengeId: "payment_xlm_003",
  assignedParameters: {
    destination: "GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV",
    amount: "2.0000000",
    asset: "XLM",
    memo: "SC-491029",
  },
  expiresAt: new Date(Date.now() + 60000).toISOString(),
};
test("assignment must belong to the selected challenge and be unexpired", () => {
  assert.throws(
    () => parseAssignment(assignment, "asset_transfer_004"),
    /match/,
  );
  assert.throws(
    () =>
      parseAssignment(
        { ...assignment, expiresAt: "2000-01-01T00:00:00Z" },
        assignment.challengeId,
      ),
    /expired/,
  );
});
test("funding submits assignment id without a fake transaction hash", () =>
  assert.deepEqual(
    submissionBody(
      { ...assignment, challengeId: "fund_account_002" },
      "fund_account_002",
      "",
    ),
    { assignment_id: assignment.assignmentId },
  ));
test("payments require a real 64-character hash and preserve assignment identity", () => {
  assert.throws(
    () => submissionBody(assignment, assignment.challengeId, "demo_hash"),
    /64/,
  );
  assert.deepEqual(
    submissionBody(assignment, assignment.challengeId, "A".repeat(64)),
    {
      assignment_id: assignment.assignmentId,
      transaction_hash: "a".repeat(64),
    },
  );
});
test("verification retains failure details and individual checks", () => {
  const result = normalizeResult({
    status: "FAILED",
    submissionId: "s1",
    failureReason: "Memo does not match",
    checks: { memo_matches: false, native_balance: 0 },
  });
  assert.equal(result.failureReason, "Memo does not match");
  assert.equal(result.checks.memo_matches, false);
  assert.equal(result.checks.native_balance, 0);
});
test("expired funding cannot be submitted without starting again", () =>
  assert.throws(
    () =>
      submissionBody(
        { ...assignment, expiresAt: "2000-01-01T00:00:00Z" },
        assignment.challengeId,
        "a".repeat(64),
      ),
    /expired/,
  ));
import { buildChallengeTransaction } from "../lib/api/transactions";
import { Asset, scValToNative } from "@stellar/stellar-sdk";
test("payment transaction preserves Testnet memo, assigned amount and destination", () => {
  const tx = buildChallengeTransaction(
    assignment.assignedParameters.destination,
    "123",
    assignment,
    "payment",
  );
  assert.equal(tx.source, assignment.assignedParameters.destination);
  assert.equal(
    new TextDecoder().decode(tx.memo.value as Uint8Array),
    assignment.assignedParameters.memo,
  );
  const op = tx.operations[0];
  assert.equal(op.type, "payment");
  if (op.type === "payment") {
    assert.equal(op.destination, assignment.assignedParameters.destination);
    assert.equal(op.amount, "2.0000000");
    assert.equal(op.asset.isNative(), true);
  }
});
test("contract transaction passes numeric challenge id and exact 32-byte nonce", () => {
  const tx = buildChallengeTransaction(
    assignment.assignedParameters.destination,
    "123",
    {
      ...assignment,
      challengeId: "soroban_contract_005",
      assignedParameters: {
        contractId: "CA3P7YT764IMXGP7TRLC64KYONLMCRGUJ23GIU646UKOEFSGPVE7UNFK",
        nonce: "a1".repeat(32),
      },
    },
    "contract",
  );
  const op = tx.operations[0];
  assert.equal(op.type, "invokeHostFunction");
  if (
    op.type === "invokeHostFunction" &&
    op.func.type === "hostFunctionTypeInvokeContract"
  ) {
    const args = op.func.invokeContract.args;
    assert.equal(scValToNative(args[1]), 5);
    assert.equal(
      Buffer.from(scValToNative(args[2])).toString("hex"),
      "a1".repeat(32),
    );
  }
});
test("asset trustline and payment use the assigned CAMPUS issuer and amount", () => {
  const a = {
    ...assignment,
    challengeId: "asset_transfer_004",
    assignedParameters: {
      ...assignment.assignedParameters,
      asset: "CAMPUS",
      assetIssuer: assignment.assignedParameters.destination,
      amount: "10.0000000",
    },
  };
  const trust = buildChallengeTransaction(
    assignment.assignedParameters.destination,
    "123",
    a,
    "trustline",
  ).operations[0];
  assert.equal(trust.type, "changeTrust");
  if (trust.type === "changeTrust" && trust.line instanceof Asset) {
    assert.equal(trust.line.getCode(), "CAMPUS");
    assert.equal(trust.line.getIssuer(), a.assignedParameters.assetIssuer);
  }
  const payment = buildChallengeTransaction(
    assignment.assignedParameters.destination,
    "123",
    a,
    "payment",
  ).operations[0];
  assert.equal(payment.type, "payment");
  if (payment.type === "payment") {
    assert.equal(payment.amount, "10.0000000");
    assert.equal(payment.asset.getIssuer(), a.assignedParameters.assetIssuer);
  }
});
test("incomplete payment and contract parameters cannot open a valid transaction", () => {
  assert.throws(
    () =>
      buildChallengeTransaction(
        assignment.assignedParameters.destination,
        "123",
        {
          ...assignment,
          assignedParameters: { ...assignment.assignedParameters, memo: "" },
        },
        "payment",
      ),
    /parameters/,
  );
  assert.throws(
    () =>
      buildChallengeTransaction(
        assignment.assignedParameters.destination,
        "123",
        {
          ...assignment,
          challengeId: "soroban_contract_005",
          assignedParameters: { contractId: "CDEMO", nonce: "fake" },
        },
        "contract",
      ),
    /nonce/,
  );
});
