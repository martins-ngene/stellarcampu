import { StrKey } from "@stellar/stellar-sdk";
import type { SigningWallet } from "./auth";
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const isValidStellarAddress = (address: unknown): address is string =>
  typeof address === "string" && StrKey.isValidEd25519PublicKey(address);
async function sdk() {
  return import("@stellar/freighter-api");
}
async function assertTestnet() {
  const result = await (await sdk()).getNetworkDetails();
  if (result.error)
    throw new Error(result.error.message || "Cannot read the wallet network.");
  if (result.networkPassphrase !== TESTNET_PASSPHRASE)
    throw new Error("Switch Freighter to Stellar Testnet, then reconnect.");
}
export async function connectFreighter(): Promise<string> {
  const api = await sdk();
  const installed = await api.isConnected();
  if (!installed.isConnected)
    throw new Error(
      "Freighter is unavailable. Install or unlock the Freighter browser extension, then try again.",
    );
  const access = await api.requestAccess();
  if (access.error)
    throw new Error(access.error.message || "Wallet access was declined.");
  if (!isValidStellarAddress(access.address))
    throw new Error(
      "Freighter did not return a valid Stellar account. Unlock your wallet and try again.",
    );
  await assertTestnet();
  return access.address;
}
export const freighterWallet: SigningWallet = {
  id: "freighter",
  name: "Freighter",
  async getAddress() {
    const result = await (await sdk()).getAddress();
    if (result.error || !isValidStellarAddress(result.address))
      throw new Error("Wallet access is unavailable. Please reconnect.");
    return result.address;
  },
  async sign(message, address) {
    await assertTestnet();
    const result = await (
      await sdk()
    ).signMessage(message, { address, networkPassphrase: TESTNET_PASSPHRASE });
    if (result.error)
      throw new Error(
        result.error.message || "Signature request was declined.",
      );
    const signature =
      typeof result.signedMessage === "string"
        ? result.signedMessage
        : result.signedMessage?.toString("base64");
    if (!signature) throw new Error("No signature returned. Please try again.");
    return { signature, address: result.signerAddress };
  },
  async signTransaction(xdr, { address, networkPassphrase }) {
    await assertTestnet();
    const api = await sdk();
    const result = await api.signTransaction(xdr, {
      address,
      networkPassphrase,
    });
    if (result.error || !result.signedTxXdr) {
      throw new Error(
        result.error?.message || "Transaction signing was declined.",
      );
    }
    return {
      signedTxXdr: result.signedTxXdr,
      signerAddress: result.signerAddress,
    };
  },
};
