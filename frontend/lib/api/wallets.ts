import type { SigningWallet } from "./auth";
import { connectFreighter, freighterWallet } from "./freighter";
import { connectXBull, isXBullInstalled, xbullWallet } from "./xbull";

export type WalletId = "freighter" | "xbull";

export type WalletInfo = {
  id: WalletId;
  name: string;
  tagline: string;
  recommended?: boolean;
  installUrl: string;
  checkAvailable(): Promise<boolean>;
  connect(): Promise<string>;
  wallet: SigningWallet;
};

export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    id: "freighter",
    name: "Freighter",
    tagline: "Recommended · Primary Stellar Testnet extension",
    recommended: true,
    installUrl: "https://www.freighter.app",
    async checkAvailable() {
      if (typeof window === "undefined") return false;
      try {
        const freighter = await import("@stellar/freighter-api");
        const status = await freighter.isConnected();
        return Boolean(status.isConnected);
      } catch {
        return false;
      }
    },
    connect: connectFreighter,
    wallet: freighterWallet,
  },
  {
    id: "xbull",
    name: "xBull Wallet",
    tagline: "Open-source non-custodial wallet & PWA",
    installUrl: "https://xbull.app",
    async checkAvailable() {
      return isXBullInstalled();
    },
    connect: connectXBull,
    wallet: xbullWallet,
  },
];

let activeWalletInstance: SigningWallet = freighterWallet;

export function getActiveWallet(): SigningWallet {
  return activeWalletInstance;
}

export function setActiveWallet(walletOrId: SigningWallet | WalletId): void {
  if (typeof walletOrId === "string") {
    activeWalletInstance = getWallet(walletOrId);
  } else {
    activeWalletInstance = walletOrId;
  }
}

export function getWallet(id: WalletId | string): SigningWallet {
  const match = SUPPORTED_WALLETS.find((w) => w.id === id);
  return match ? match.wallet : freighterWallet;
}

export async function connectWallet(
  id: WalletId,
): Promise<{ address: string; wallet: SigningWallet }> {
  const info = SUPPORTED_WALLETS.find((w) => w.id === id);
  if (!info) {
    throw new Error(`Unsupported wallet connector: "${id}".`);
  }
  const address = await info.connect();
  activeWalletInstance = info.wallet;
  return { address, wallet: info.wallet };
}
