import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authenticateWallet,
  parseChallenge,
  parseSession,
} from "../lib/api/auth";
const address = "GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV";
test("expired challenge cannot be signed", () =>
  assert.throws(
    () =>
      parseChallenge({
        nonce: "abc",
        message: "Sign abc",
        expiresAt: "2000-01-01T00:00:00Z",
      }),
    /expired/,
  ));
test("auth response must contain a verified user matching the requested wallet", () => {
  assert.throws(() =>
    parseSession(
      { token: "token", user: { stellarAddress: address, isVerified: false } },
      address,
    ),
  );
  assert.throws(() =>
    parseSession(
      { token: "token", user: { stellarAddress: "other", isVerified: true } },
      address,
    ),
  );
});
test("wallet account change during signing aborts before verify", async () => {
  let verified = false;
  await assert.rejects(
    authenticateWallet({
      address,
      challenge: {
        nonce: "abc",
        message: "exact server message",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
      wallet: {
        getAddress: async () => address,
        sign: async () => ({ signature: "base64", address: "other" }),
      },
      verify: async () => {
        verified = true;
        throw Error("must not call");
      },
    }),
    /changed/,
  );
  assert.equal(verified, false);
});
test("signs the exact API message and passes signature unchanged to verification", async () => {
  const message = "Sign this exact message: nonce-123";
  let signedMessage = "";
  let receivedSignature = "";
  const result = await authenticateWallet({
    address,
    challenge: {
      nonce: "nonce-123",
      message,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    },
    wallet: {
      getAddress: async () => address,
      sign: async (text) => {
        signedMessage = text;
        return { signature: "base64-signature", address };
      },
    },
    verify: async (signature) => {
      receivedSignature = signature;
      return {
        token: "session-token",
        user: {
          id: "u1",
          username: "builder",
          displayName: "Builder",
          email: "a@example.com",
          stellarAddress: address,
          isVerified: true,
          role: "STUDENT",
        },
      };
    },
  });
  assert.equal(signedMessage, message);
  assert.equal(receivedSignature, "base64-signature");
  assert.equal(result.user.stellarAddress, address);
});
test("a changed account before signing does not open a signing request", async () => {
  let signed = false;
  await assert.rejects(
    authenticateWallet({
      address,
      challenge: {
        nonce: "n",
        message: "message",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
      wallet: {
        getAddress: async () => "other",
        sign: async () => {
          signed = true;
          return { signature: "s", address };
        },
      },
      verify: async () => null,
    }),
    /changed/,
  );
  assert.equal(signed, false);
});
