"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api/client";
import {
  CHALLENGE_IDS,
  historyResult,
  parseAssignment,
  submitEvidence,
  type Assignment,
  type ChallengeDetail,
  type VerificationResult,
} from "@/lib/api/challenges";
import { safeExplorer } from "@/lib/api/student";
import type { LiveSession } from "@/lib/api/auth";
import { useLiveAuth } from "./provider";

type Memory = {
  assignment: Assignment | null;
  hash: string;
  result: VerificationResult | null;
  trustlineHash?: string;
  broadcastHash?: string;
};
const cache = new WeakMap<LiveSession, Map<string, Memory>>();
function memory(session: LiveSession, id: string): Memory {
  let entries = cache.get(session);
  if (!entries) {
    entries = new Map();
    cache.set(session, entries);
  }
  let value = entries.get(id);
  if (!value) {
    value = { assignment: null, hash: "", result: null };
    entries.set(id, value);
  }
  return value;
}
function patchMemory(session: LiveSession, id: string, patch: Partial<Memory>) {
  const previous = memory(session, id);
  cache.get(session)!.set(id, { ...previous, ...patch });
}
export function ResultCard({ result }: { result: VerificationResult }) {
  const url = safeExplorer(result.explorerUrl);
  return (
    <section
      className={`p-panel p-live-result p-live-result-${result.status.toLowerCase()}`}
      aria-live="polite"
    >
      <p className="p-eyebrow">Verification result</p>
      <h2>
        {result.status === "VERIFIED"
          ? "Challenge verified"
          : result.status === "FAILED"
            ? "Verification failed"
            : result.status === "DUPLICATE"
              ? "Evidence already used"
              : "Verification pending"}
      </h2>
      {result.failureReason && <p>{result.failureReason}</p>}
      {result.status === "DUPLICATE" && (
        <p>
          Execute a fresh transaction using an active assignment. Reusing the
          same transaction will not earn completion.
        </p>
      )}
      {result.status === "PENDING" && (
        <p>
          Your evidence is still pending. It has not been marked failed or
          counted toward completion.
        </p>
      )}
      <dl className="p-live-checks">
        {Object.entries(result.checks).map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll("_", " ")}</dt>
            <dd>
              {typeof value === "boolean"
                ? value
                  ? "✓ Passed"
                  : "✕ Failed"
                : String(value)}
            </dd>
          </div>
        ))}
      </dl>
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          View transaction on Stellar Explorer ↗
        </a>
      )}
      {result.submissionId && (
        <p className="p-field-help">Submission: {result.submissionId}</p>
      )}
    </section>
  );
}
export function LiveChallengeWorkspace({
  id,
  session,
  onVerified,
}: {
  id: string;
  session: LiveSession;
  onVerified(): void;
}) {
  const auth = useLiveAuth();
  const saved = memory(session, id);
  const [assignment, setAssignment] = useState(saved.assignment);
  const [hash, setHash] = useState(saved.hash);
  const [result, setResult] = useState(saved.result);
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    void apiRequest(`/challenges/${encodeURIComponent(id)}`, {
      token: session.token,
      signal: abort.signal,
    })
      .then((value) => {
        const d = value as ChallengeDetail;
        if (
          d.id !== id ||
          typeof d.title !== "string" ||
          d.network !== "testnet" ||
          typeof d.isActive !== "boolean"
        )
          throw Error("Invalid challenge details.");
        if (!abort.signal.aborted) {
          setDetail(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Cannot load this challenge.",
          );
      });
    return () => abort.abort();
  }, [id, session, retry]);
  const expired = !!assignment && Date.parse(assignment.expiresAt) <= clock;
  const finished = result?.status === "VERIFIED";
  const visibleKeys =
    id === "asset_transfer_004"
      ? ["destination", "amount", "asset", "assetIssuer", "memo"]
      : id === "payment_xlm_003"
        ? ["destination", "amount", "asset", "memo"]
        : id === "soroban_contract_005"
          ? ["contractId", "nonce"]
          : [];

  const isBasic = id === "wallet_verify_001" || id === "fund_account_002";
  function updateHash(value: string) {
    patchMemory(session, id, { hash: value });
    setHash(value);
  }
  async function action(
    label: string,
    fn: (signal: AbortSignal) => Promise<void>,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      await fn(abort.signal);
    } catch (e) {
      if (!abort.signal.aborted) {
        if (e instanceof ApiError && e.status === 401) {
          auth.clear();
          return;
        }
        setError(
          e instanceof Error ? e.message : "Action failed. Please try again.",
        );
      }
    } finally {
      lock.current = false;
      if (!abort.signal.aborted) setBusy("");
    }
  }
  async function start(signal: AbortSignal) {
    const a = parseAssignment(
      await apiRequest(`/challenges/${encodeURIComponent(id)}/start`, {
        token: session.token,
        body: {},
        signal,
      }),
      id,
    );
    if (signal.aborted) return;
    patchMemory(session, id, {
      assignment: a,
      result: null,
      trustlineHash: undefined,
      broadcastHash: undefined,
    });
    setAssignment(a);
    setResult(null);
    updateHash("");
  }
  async function transact(
    kind: "payment" | "trustline" | "contract",
    signal: AbortSignal,
  ) {
    if (!assignment) return;
    const { executeTransaction } = await import("@/lib/api/transactions");
    const sent = await executeTransaction({
      address: session.user.stellarAddress,
      assignment,
      kind,
      signal,
      onBroadcast(value) {
        if (kind === "trustline")
          patchMemory(session, id, { trustlineHash: value });
        else {
          patchMemory(session, id, { broadcastHash: value });
          updateHash(value);
        }
        setNotice(
          `Transaction reference: ${value}. If the connection drops, check this transaction before sending again.`,
        );
      },
    });
    if (!signal.aborted)
      setNotice(
        sent.pending
          ? `Submitted to Testnet: ${sent.hash}. Inclusion is not confirmed yet. Wait before verifying evidence.`
          : kind === "trustline"
            ? "Trustline confirmed. You can now request CAMPUS tokens."
            : "Transaction confirmed on Testnet. Submit its hash below for challenge verification.",
      );
  }
  async function submit(signal: AbortSignal) {
    if (!assignment) return;
    const value = await submitEvidence(
      id,
      assignment,
      hash,
      session.token,
      signal,
    );
    if (signal.aborted) return;
    patchMemory(session, id, { result: value });
    setResult(value);
    if (value.status === "VERIFIED") onVerified();
  }
  if (!CHALLENGE_IDS.includes(id as (typeof CHALLENGE_IDS)[number]))
    return <p role="alert">Challenge not found.</p>;
  return (
    <div className="p-live-challenge-layout">
      <div>
        <section className="p-panel p-registration">
          <p className="p-eyebrow">
            {detail?.category} / {detail?.difficulty}
          </p>
          <h2>{detail?.title ?? "Loading challenge…"}</h2>
          <p>{detail?.description}</p>
          {typeof detail?.config?.instructions === "string" && (
            <p>{detail.config.instructions}</p>
          )}
          <p className="p-field-help">
            Stellar Testnet only. Wallet approval is required before a
            transaction is signed.
          </p>
          {!detail && (
            <button
              className="p-button p-secondary"
              onClick={() => setRetry((v) => v + 1)}
            >
              Retry loading details
            </button>
          )}
          {detail && !detail.isActive && (
            <p role="alert">This challenge is currently inactive.</p>
          )}
          <button
            className="p-button p-primary p-full"
            disabled={!!busy || !detail?.isActive}
            onClick={() => {
              if (
                assignment &&
                !window.confirm(
                  "Start a new assignment? Keep any existing transaction hash for your records. Use the new memo/nonce for new transactions.",
                )
              )
                return;
              void action("Starting assignment…", start);
            }}
          >
            {assignment ? "Start a new assignment" : "Start challenge"}
          </button>
          {assignment && (
            <>
              <h3>Assigned parameters</h3>
              <dl className="p-live-parameters">
                {Object.entries(assignment.assignedParameters)
                  .filter(
                    ([key, v]) =>
                      visibleKeys.includes(key) && typeof v === "string",
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        <code>{value}</code>
                      </dd>
                    </div>
                  ))}
                <div>
                  <dt>Expires</dt>
                  <dd>{assignment.expiresAt}</dd>
                </div>
              </dl>
              {expired && (
                <p role="alert">
                  Assignment expired. Start a new one before executing or
                  submitting.
                </p>
              )}
              {!expired && !finished && (
                <div className="p-live-actions">
                  {id === "fund_account_002" && (
                    <button
                      className="p-button p-secondary"
                      disabled={!!busy}
                      onClick={() =>
                        void action(
                          "Requesting free test XLM…",
                          async (signal) => {
                            const { requestTestFunds } =
                              await import("@/lib/api/transactions");
                            await requestTestFunds(
                              session.user.stellarAddress,
                              signal,
                            );
                            if (!signal.aborted)
                              setNotice(
                                "Friendbot completed. Verify account funding below. If already funded, you can verify directly.",
                              );
                          },
                        )
                      }
                    >
                      Get free test XLM
                    </button>
                  )}
                  {id === "asset_transfer_004" && (
                    <>
                      <button
                        className="p-button p-secondary"
                        disabled={!!busy || !!saved.trustlineHash}
                        onClick={() =>
                          void action(
                            "Review the CAMPUS trustline in Freighter…",
                            (signal) => transact("trustline", signal),
                          )
                        }
                      >
                        1. Establish CAMPUS trustline
                      </button>
                      {saved.trustlineHash && (
                        <p className="p-field-help">
                          Trustline transaction: {saved.trustlineHash}. Confirm
                          inclusion before claiming tokens.
                        </p>
                      )}
                      <button
                        className="p-button p-secondary"
                        disabled={!!busy}
                        onClick={() =>
                          void action(
                            "Claiming test CAMPUS tokens…",
                            async (signal) => {
                              const value = (await apiRequest(
                                `/challenges/${id}/claim-tokens`,
                                { token: session.token, body: {}, signal },
                              )) as { message?: string };
                              if (!signal.aborted)
                                setNotice(
                                  value.message ||
                                    "Token request completed. Check your balance before transferring.",
                                );
                            },
                          )
                        }
                      >
                        2. Claim CAMPUS tokens
                      </button>
                    </>
                  )}
                  {!isBasic && (
                    <>
                      <button
                        className="p-button p-secondary"
                        disabled={!!busy || !!saved.broadcastHash}
                        onClick={() =>
                          void action(
                            id === "soroban_contract_005"
                              ? "Preparing contract and requesting wallet approval…"
                              : "Review the assigned payment in Freighter…",
                            (signal) =>
                              transact(
                                id === "soroban_contract_005"
                                  ? "contract"
                                  : "payment",
                                signal,
                              ),
                          )
                        }
                      >
                        {id === "asset_transfer_004"
                          ? "3. Transfer assigned CAMPUS"
                          : id === "soroban_contract_005"
                            ? "Invoke assigned Soroban contract"
                            : "Send assigned XLM payment"}
                      </button>
                      {saved.hash && (
                        <p className="p-field-help">
                          A transaction reference is saved. Verify it or inspect
                          it before creating another transaction.
                        </p>
                      )}
                      <label className="p-live-field">
                        Transaction hash
                        <input
                          value={hash}
                          onChange={(e) => updateHash(e.target.value)}
                          disabled={!!busy}
                          placeholder="64-character Testnet transaction hash"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </label>
                    </>
                  )}
                  <button
                    className="p-button p-primary"
                    disabled={
                      !!busy ||
                      result?.status === "PENDING" ||
                      (!isBasic && !/^(0x)?[a-f0-9]{64}$/i.test(hash.trim()))
                    }
                    onClick={() =>
                      void action(
                        "Verifying evidence with StellarCampus…",
                        submit,
                      )
                    }
                  >
                    {isBasic
                      ? "Verify challenge evidence"
                      : "Submit transaction for verification"}
                  </button>
                </div>
              )}
            </>
          )}
          {busy && (
            <p role="status">
              <span className="p-spinner" />
              {busy}
            </p>
          )}
          {notice && (
            <p className="p-note" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="p-live-error" role="alert">
              {error}
            </p>
          )}
        </section>
        {result && (
          <>
            <ResultCard result={result} />
            {result.status === "PENDING" && (
              <p className="p-note">
                Check your submission in history. An unresolved result stays
                pending.
              </p>
            )}
            {result.submissionId && (
              <Link
                className="p-button p-secondary"
                href={`/portal/submissions/${encodeURIComponent(result.submissionId)}`}
              >
                View full verification record
              </Link>
            )}
          </>
        )}
      </div>
      <aside className="p-panel p-registration">
        <h2>Build → submit → verify</h2>
        <ol className="p-live-instructions">
          <li>Start an assignment to receive your unique parameters.</li>
          <li>
            Review its destination, amount, asset and memo before approving in
            your wallet.
          </li>
          <li>
            Submit the Testnet hash. Funding and ownership checks use your
            assignment without a hash.
          </li>
          <li>Only API-verified evidence earns completion.</li>
        </ol>
        <p className="p-field-help">
          Assignments and transaction references stay in this signed-in session.
          Reloading requires signing in and starting a new assignment. Do not
          resend a transaction just because a request timed out.
        </p>
        <Link href="/portal/challenges">Back to all challenges</Link>
      </aside>
    </div>
  );
}
export function LiveSubmissionDetail({
  id,
  session,
}: {
  id: string;
  session: LiveSession;
}) {
  const auth = useLiveAuth();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function load() {
      try {
        const value = await historyResult(id, session.token, controller.signal);
        if (controller.signal.aborted) return;
        if (!value) throw Error("Submission not found in your history.");
        setResult(value);
        setError("");
        if (value.status === "PENDING" && polls++ < 5)
          timer = setTimeout(() => void load(), 2000);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          auth.clear();
          return;
        }
        setError(
          e instanceof Error ? e.message : "Cannot load verification record.",
        );
      }
    }
    void load();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
    // The authenticated session and record ID define this read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, retry]);
  return (
    <div className="p-live-list">
      {result && <ResultCard result={result} />}
      <p role={error ? "alert" : "status"}>
        {error ||
          (!result
            ? "Loading verification record…"
            : result.status === "PENDING"
              ? "Still pending. Refresh to check again; no failure has been assumed."
              : "")}
      </p>
      <button
        className="p-button p-secondary"
        onClick={() => setRetry((v) => v + 1)}
      >
        Refresh verification
      </button>
      <Link href="/portal/challenges">Back to challenges</Link>
    </div>
  );
}
