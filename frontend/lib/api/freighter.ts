import type { SigningWallet } from "./auth";
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const validAddress = (address: string) => /^G[A-Z2-7]{55}$/.test(address);
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
  if (!validAddress(access.address))
    throw new Error(
      "Freighter did not return a valid Stellar account. Unlock your wallet and try again.",
    );
  await assertTestnet();
  return access.address;
}
export const freighterWallet: SigningWallet = {
  async getAddress() {
    const result = await (await sdk()).getAddress();
    if (result.error || !validAddress(result.address))
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
};
