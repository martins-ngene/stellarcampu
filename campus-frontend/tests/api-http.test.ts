import { test } from "node:test";
import assert from "node:assert/strict";
import { apiRequest, ApiError, API_BASE_URL } from "../lib/api/client";
import {
  parseChallenge,
  parseSession,
  authenticateWallet,
} from "../lib/api/auth";
import { parseChallenges, parseProgress } from "../lib/api/student";
const enabled = process.env.CAMPUS_HTTP_TEST === "1";
if (
  enabled &&
  !/^http:\/\/(localhost|127\.0\.0\.1):\d+\/campus\/api$/.test(API_BASE_URL)
)
  throw Error("HTTP contract tests require a local Postman simulation URL.");
const address = "GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV";
test(
  "HTTP contract: challenge, signature exchange, authenticated reads, replay and 401",
  { skip: !enabled },
  async () => {
    await apiRequest("/__test/reset", { token: "simulation-token", body: {} });
    await assert.rejects(
      apiRequest("/challenges"),
      (e) => e instanceof ApiError && e.status === 401,
    );
    await assert.rejects(
      apiRequest("/auth/challenge", { body: { stellar_address: "GDEMO" } }),
      (e) => e instanceof ApiError && e.status === 400,
    );
    const challenge = parseChallenge(
      await apiRequest("/auth/challenge", {
        body: { stellar_address: address },
      }),
    );
    const session = await authenticateWallet({
      address,
      challenge,
      wallet: {
        getAddress: async () => address,
        sign: async () => ({
          address,
          signature: "c2ltdWxhdGVkLXNpZ25hdHVyZQ==",
        }),
      },
      verify: (signature) =>
        apiRequest("/auth/verify", {
          body: {
            stellar_address: address,
            signature,
            username: "http_builder",
            email: "builder@example.com",
          },
        }),
    });
    parseSession(session, address);
    assert.equal(session.user.username, "http_builder");
    const options = { token: session.token };
    assert.equal(
      parseChallenges(await apiRequest("/challenges", options))[0].status,
      "COMPLETED",
    );
    assert.equal(
      parseProgress(await apiRequest("/students/me/progress", options)).summary
        .verified_challenges,
      1,
    );
    assert.deepEqual(await apiRequest("/students/me/history", options), {
      submissions: [],
    });
    await assert.rejects(
      apiRequest("/auth/verify", {
        body: {
          stellar_address: address,
          signature: "c2ltdWxhdGVkLXNpZ25hdHVyZQ==",
        },
      }),
      (e) => e instanceof ApiError && e.status === 401,
    );
  },
);

test(
  "HTTP contract: rate limits, unavailable HTML, expired sessions and timeouts",
  { skip: !enabled },
  async () => {
    for (const status of [401, 409, 422, 429, 503])
      await assert.rejects(
        apiRequest(`/__test/${status}`, { token: "simulation-token" }),
        (e) => e instanceof ApiError && e.status === status,
      );
    await assert.rejects(
      apiRequest("/__test/malformed", { token: "simulation-token" }),
      /unreadable response/,
    );
    await assert.rejects(
      apiRequest("/__test/timeout", { token: "simulation-token", timeout: 30 }),
      /timed out/,
    );
  },
);
import {
  parseAssignment,
  submitEvidence,
  historyResult,
} from "../lib/api/challenges";
test(
  "HTTP challenges: details, assignments, no-hash funding and result semantics",
  { skip: !enabled },
  async () => {
    const token = "simulation-token";
    const id = "fund_account_002";
    const detail = (await apiRequest(`/challenges/${id}`, { token })) as {
      isActive: boolean;
    };
    assert.equal(detail.isActive, true);
    const a = parseAssignment(
      await apiRequest(`/challenges/${id}/start`, { token, body: {} }),
      id,
    );
    const funded = await submitEvidence(id, a, "", token);
    assert.equal(funded.status, "VERIFIED");
    assert.equal(
      (await historyResult(funded.submissionId!, token))?.status,
      "VERIFIED",
    );
    const paymentId = "payment_xlm_003";
    const payment = parseAssignment(
      await apiRequest(`/challenges/${paymentId}/start`, { token, body: {} }),
      paymentId,
    );
    const failed = await submitEvidence(
      paymentId,
      payment,
      "a".repeat(64),
      token,
    );
    assert.equal(failed.status, "FAILED");
    assert.match(failed.failureReason!, /memo/);
    assert.equal(failed.checks.memo_matches, false);
    assert.equal(
      (await submitEvidence(paymentId, payment, "d".repeat(64), token)).status,
      "DUPLICATE",
    );
    assert.equal(
      (await submitEvidence(paymentId, payment, "e".repeat(64), token)).status,
      "PENDING",
    );
    assert.equal(
      (await submitEvidence(paymentId, payment, "b".repeat(64), token)).status,
      "VERIFIED",
    );
  },
);
