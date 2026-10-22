import { StrKey } from "@stellar/stellar-sdk";
import type { SigningWallet } from "./auth";
import { TESTNET_PASSPHRASE, isValidStellarAddress } from "./freighter";

declare global {
  interface Window {
    xBullSDK?: {
      connect(params?: {
        canRequestPublicKey?: boolean;
        canRequestSign?: boolean;
      }): Promise<unknown>;
      getPublicKey(): Promise<string>;
      signXDR(
        xdr: string,
        options?: { network?: string; publicKey?: string },
      ): Promise<string>;
      signMessage?(
        message: string,
        options?: { address?: string; networkPassphrase?: string },
      ): Promise<
        | { signedMessage?: string; signerAddress?: string }
        | string
      >;
    };
  }
}

export function isXBullInstalled(): boolean {
  return typeof window !== "undefined" && Boolean(window.xBullSDK);
}

export async function connectXBull(): Promise<string> {
  if (typeof window === "undefined" || !window.xBullSDK) {
    throw new Error(
      "xBull Wallet is unavailable. Install or unlock the xBull browser extension from xbull.app, then try again.",
    );
  }
  const sdk = window.xBullSDK;
  try {
    if (typeof sdk.connect === "function") {
      await sdk.connect({ canRequestPublicKey: true, canRequestSign: true });
    }
    const address = await sdk.getPublicKey();
    if (!isValidStellarAddress(address)) {
      throw new Error(
        "xBull did not return a valid Stellar account. Unlock your wallet and try again.",
      );
    }
    return address;
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error("xBull connection request was declined or failed.");
  }
}

export const xbullWallet: SigningWallet = {
  id: "xbull",
  name: "xBull Wallet",
  async getAddress() {
    if (typeof window === "undefined" || !window.xBullSDK) {
      throw new Error("xBull Wallet is unavailable. Please install or unlock xBull.");
    }
    const address = await window.xBullSDK.getPublicKey();
    if (!isValidStellarAddress(address)) {
      throw new Error("xBull did not return a valid Stellar account. Please reconnect.");
    }
    return address;
  },
  async sign(message, address) {
    if (typeof window === "undefined" || !window.xBullSDK) {
      throw new Error("xBull Wallet is unavailable. Please reconnect.");
    }
    const sdk = window.xBullSDK;
    if (typeof sdk.signMessage === "function") {
      const res = await sdk.signMessage(message, {
        address,
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      const sig = typeof res === "string" ? res : res?.signedMessage;
      const signer = typeof res === "object" ? res?.signerAddress || address : address;
      if (!sig) throw new Error("xBull did not return a message signature.");
      return { signature: sig, address: signer };
    }
    throw new Error(
      "xBull message signing requires xBull extension v0.5+ with signMessage support. Use Freighter for automated SEP-53 verification.",
    );
  },
  async signTransaction(xdr, { address }) {
    if (typeof window === "undefined" || !window.xBullSDK) {
      throw new Error("xBull Wallet is unavailable. Please reconnect.");
    }
    const sdk = window.xBullSDK;
    const signedXdr = await sdk.signXDR(xdr, {
      network: "TESTNET",
      publicKey: address,
    });
    if (!signedXdr) {
      throw new Error("xBull declined or did not return a signed transaction.");
    }
    return { signedTxXdr: signedXdr, signerAddress: address };
  },
};
