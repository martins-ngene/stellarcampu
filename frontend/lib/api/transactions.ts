import {
  Account,
  Address,
  Asset,
  Contract,
  Memo,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  Networks,
} from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { parseAssignment, type Assignment } from "./challenges";
import { TESTNET_PASSPHRASE } from "./freighter";
import { getActiveWallet } from "./wallets";
export const HORIZON = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC = "https://soroban-testnet.stellar.org";
export const FRIENDBOT = "https://friendbot.stellar.org";
export async function networkJson(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, 60000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json();
    if (!response.ok)
      throw Error(
        data?.detail ||
          data?.message ||
          "Stellar Testnet request failed. Check your account and try again.",
      );
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
export function buildChallengeTransaction(
  address: string,
  sequence: string,
  a: Assignment,
  kind: "payment" | "trustline" | "contract",
): Transaction {
  parseAssignment(a, a.challengeId);
  if (!StrKey.isValidEd25519PublicKey(address))
    throw Error("Invalid Stellar wallet address.");
  const p = a.assignedParameters;
  const remaining = Math.floor((Date.parse(a.expiresAt) - Date.now()) / 1000);
  if (remaining < 15)
    throw Error("Assignment is about to expire. Start a new assignment.");
  const builder = new TransactionBuilder(new Account(address, sequence), {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  }).setTimeout(Math.min(180, remaining));
  if (kind === "trustline") {
    if (
      a.challengeId !== "asset_transfer_004" ||
      !p.asset ||
      !p.assetIssuer ||
      !StrKey.isValidEd25519PublicKey(p.assetIssuer)
    )
      throw Error("Assignment has no valid asset issuer.");
    builder.addOperation(
      Operation.changeTrust({
        asset: new Asset(p.asset, p.assetIssuer),
        limit: "1000",
      }),
    );
  } else if (kind === "payment") {
    if (
      !["payment_xlm_003", "asset_transfer_004"].includes(a.challengeId) ||
      !p.destination ||
      !StrKey.isValidEd25519PublicKey(p.destination) ||
      !p.amount ||
      !/^\d+(\.\d{1,7})?$/.test(p.amount) ||
      Number(p.amount) <= 0 ||
      !p.memo ||
      Buffer.byteLength(p.memo, "utf8") > 28
    )
      throw Error("Assignment is missing valid payment parameters.");
    const asset =
      a.challengeId === "payment_xlm_003"
        ? Asset.native()
        : p.asset &&
            p.assetIssuer &&
            StrKey.isValidEd25519PublicKey(p.assetIssuer)
          ? new Asset(p.asset, p.assetIssuer)
          : null;
    if (!asset) throw Error("Assignment has no valid asset or issuer.");
    builder
      .addOperation(
        Operation.payment({
          destination: p.destination,
          amount: p.amount,
          asset,
        }),
      )
      .addMemo(Memo.text(p.memo));
  } else {
    if (
      a.challengeId !== "soroban_contract_005" ||
      !p.contractId ||
      !StrKey.isValidContract(p.contractId) ||
      !p.nonce ||
      !/^[a-f0-9]{64}$/i.test(p.nonce)
    )
      throw Error(
        "Assignment has no valid contract or 32-byte evidence nonce.",
      );
    builder.addOperation(
      new Contract(p.contractId).call(
        "complete_challenge",
        new Address(address).toScVal(),
        nativeToScVal(5, { type: "u32" }),
        nativeToScVal(Buffer.from(p.nonce, "hex"), { type: "bytes" }),
      ),
    );
  }
  return builder.build();
}
export async function requestTestFunds(address: string, signal?: AbortSignal) {
  if (!StrKey.isValidEd25519PublicKey(address))
    throw Error("Invalid Stellar address.");
  return networkJson(
    `${FRIENDBOT}?addr=${encodeURIComponent(address)}`,
    {},
    signal,
  );
}
export async function executeTransaction({
  address,
  assignment,
  kind,
  signal,
  onBroadcast,
}: {
  address: string;
  assignment: Assignment;
  kind: "payment" | "trustline" | "contract";
  signal: AbortSignal;
  onBroadcast(hash: string): void;
}): Promise<{ hash: string; pending: boolean }> {
  const active = () => {
    if (signal.aborted) throw Error("Action cancelled.");
    parseAssignment(assignment, assignment.challengeId);
  };
  active();
  const wallet = getActiveWallet();
  if ((await wallet.getAddress()) !== address)
    throw Error("Wallet account changed. Sign in again.");
  const account = await networkJson(
    `${HORIZON}/accounts/${address}`,
    {},
    signal,
  );
  active();
  if (typeof account.sequence !== "string")
    throw Error(
      "Account is not funded on Testnet. Use the funding challenge first.",
    );
  let tx = buildChallengeTransaction(
    address,
    account.sequence,
    assignment,
    kind,
  );
  const server =
    kind === "contract"
      ? new rpc.Server(SOROBAN_RPC, { timeout: 60000 })
      : null;
  if (server) {
    tx = await server.prepareTransaction(tx, false);
    active();
  }
  let signedTxXdr: string;
  let signerAddress: string | undefined;
  if (typeof wallet.signTransaction === "function") {
    const res = await wallet.signTransaction(tx.toXDR(), {
      networkPassphrase: TESTNET_PASSPHRASE,
      address,
    });
    signedTxXdr = res.signedTxXdr;
    signerAddress = res.signerAddress;
  } else {
    const freighter = await import("@stellar/freighter-api");
    const network = await freighter.getNetworkDetails();
    if (network.error || network.networkPassphrase !== TESTNET_PASSPHRASE)
      throw Error("Switch Freighter to Stellar Testnet before signing.");
    const signed = await freighter.signTransaction(tx.toXDR(), {
      networkPassphrase: TESTNET_PASSPHRASE,
      address,
    });
    if (signed.error || !signed.signedTxXdr)
      throw Error(signed.error?.message || "Transaction signing was declined.");
    signedTxXdr = signed.signedTxXdr;
    signerAddress = signed.signerAddress;
  }
  active();
  if (
    (signerAddress && signerAddress !== address) ||
    (await wallet.getAddress()) !== address
  )
    throw Error("Wallet account changed. Transaction was not submitted.");
  const envelope = TransactionBuilder.fromXDR(
    signedTxXdr,
    Networks.TESTNET,
  );
  if (
    !(envelope instanceof Transaction) ||
    envelope.signatures.length === 0 ||
    Buffer.from(envelope.hash()).toString("hex") !==
      Buffer.from(tx.hash()).toString("hex")
  )
    throw Error(
      "Wallet returned a different transaction. Nothing was submitted.",
    );
  active();
  const hash = Buffer.from(envelope.hash()).toString("hex");
  onBroadcast(hash);
  // Preserve this hash before sending: a timeout must not trigger an accidental second payment.
  if (server) {
    const sent = await server.sendTransaction(envelope);
    if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER")
      throw Error(
        `RPC submission ${sent.status}. Check transaction ${hash} before retrying.`,
      );
    return { hash, pending: true };
  }
  const result = await networkJson(
    `${HORIZON}/transactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tx: envelope.toXDR() }),
    },
    signal,
  );
  if (result.successful === false)
    throw Error(
      `Transaction ${hash} did not succeed. Check it on Stellar Explorer.`,
    );
  return { hash, pending: false };
}
