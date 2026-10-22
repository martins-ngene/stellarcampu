import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_WALLETS,
  getWallet,
  getActiveWallet,
  setActiveWallet,
  connectWallet,
} from "../lib/api/wallets";
import { freighterWallet } from "../lib/api/freighter";
import { xbullWallet } from "../lib/api/xbull";

const validAddress = "GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV";

test("supported wallets catalog includes Freighter and xBull with install URLs", () => {
  const ids = SUPPORTED_WALLETS.map((w) => w.id);
  assert.ok(ids.includes("freighter"));
  assert.ok(ids.includes("xbull"));
  const freighter = SUPPORTED_WALLETS.find((w) => w.id === "freighter");
  const xbull = SUPPORTED_WALLETS.find((w) => w.id === "xbull");
  assert.equal(freighter?.recommended, true);
  assert.ok(freighter?.installUrl.includes("freighter.app"));
  assert.ok(xbull?.installUrl.includes("xbull.app"));
});

test("getWallet returns correct wallet instances and defaults to Freighter", () => {
  assert.equal(getWallet("freighter"), freighterWallet);
  assert.equal(getWallet("xbull"), xbullWallet);
  assert.equal(getWallet("unknown_wallet"), freighterWallet);
});

test("active wallet switching preserves current provider", () => {
  setActiveWallet("xbull");
  assert.equal(getActiveWallet().id, "xbull");
  setActiveWallet("freighter");
  assert.equal(getActiveWallet().id, "freighter");
  setActiveWallet(xbullWallet);
  assert.equal(getActiveWallet().id, "xbull");
  setActiveWallet(freighterWallet);
  assert.equal(getActiveWallet().id, "freighter");
});

test("xbullWallet throws descriptive error when extension is unavailable", async () => {
  const originalWindow = globalThis.window;
  try {
    // @ts-expect-error Mocking window environment
    globalThis.window = {};
    await assert.rejects(
      () => xbullWallet.getAddress(),
      /unavailable|install or unlock xBull/i,
    );
    await assert.rejects(
      () => xbullWallet.sign("test", validAddress),
      /unavailable|reconnect/i,
    );
    await assert.rejects(
      () =>
        xbullWallet.signTransaction!("AAAA", {
          address: validAddress,
          networkPassphrase: "Test SDF Network ; September 2015",
        }),
      /unavailable|reconnect/i,
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("xbullWallet validates address and delegates signing when SDK is present", async () => {
  const originalWindow = globalThis.window;
  try {
    // @ts-expect-error Mocking window with xBullSDK
    globalThis.window = {
      xBullSDK: {
        async connect() {
          return true;
        },
        async getPublicKey() {
          return validAddress;
        },
        async signXDR(xdr: string) {
          return `signed_${xdr}`;
        },
        async signMessage(msg: string) {
          return { signedMessage: `sig_for_${msg}`, signerAddress: validAddress };
        },
      },
    };

    const addr = await xbullWallet.getAddress();
    assert.equal(addr, validAddress);

    const signedMsg = await xbullWallet.sign("challenge-123", validAddress);
    assert.equal(signedMsg.signature, "sig_for_challenge-123");
    assert.equal(signedMsg.address, validAddress);

    const signedTx = await xbullWallet.signTransaction!("test_xdr", {
      address: validAddress,
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    assert.equal(signedTx.signedTxXdr, "signed_test_xdr");
    assert.equal(signedTx.signerAddress, validAddress);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("connectWallet sets the active wallet upon successful connection", async () => {
  const originalWindow = globalThis.window;
  try {
    // @ts-expect-error Mocking partial window
    globalThis.window = {
      xBullSDK: {
        async connect() {
          return true;
        },
        async getPublicKey() {
          return validAddress;
        },
        async signXDR(xdr: string) {
          return xdr;
        },
      },
    };
    const { address, wallet } = await connectWallet("xbull");
    assert.equal(address, validAddress);
    assert.equal(wallet.id, "xbull");
    assert.equal(getActiveWallet().id, "xbull");
  } finally {
    globalThis.window = originalWindow;
    setActiveWallet("freighter");
  }
});
