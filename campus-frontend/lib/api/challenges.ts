import { apiRequest, ApiError } from "./client";
export const CHALLENGE_IDS = [
  "wallet_verify_001",
  "fund_account_002",
  "payment_xlm_003",
  "asset_transfer_004",
  "soroban_contract_005",
] as const;
export type ChallengeId = (typeof CHALLENGE_IDS)[number];
export type Assignment = {
  assignmentId: string;
  challengeId: string;
  assignedParameters: {
    destination?: string;
    amount?: string;
    asset?: string;
    assetIssuer?: string;
    memo?: string;
    nonce?: string;
    contractId?: string;
  };
  expiresAt: string;
};
export type ChallengeDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  network: string;
  isActive: boolean;
  config: Record<string, unknown>;
};
export type VerificationResult = {
  status: "VERIFIED" | "FAILED" | "PENDING" | "DUPLICATE";
  submissionId?: string;
  failureReason?: string;
  checks: Record<string, boolean | string | number | null>;
  explorerUrl?: string | null;
  completedAt?: string;
};
export function parseAssignment(
  value: unknown,
  challengeId: string,
): Assignment {
  const a = value as Assignment;
  if (!a || a.challengeId !== challengeId)
    throw Error("Assignment does not match this challenge. Start again.");
  if (
    typeof a.assignmentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      a.assignmentId,
    ) ||
    !a.assignedParameters ||
    typeof a.assignedParameters !== "object" ||
    typeof a.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(a.expiresAt))
  )
    throw Error("Invalid assignment response. Please try again.");
  if (Date.parse(a.expiresAt) <= Date.now())
    throw Error("Assignment expired. Start a new assignment.");
  return a;
}
export function submissionBody(
  a: Assignment,
  id: string,
  hash: string,
): { assignment_id: string; transaction_hash?: string } {
  parseAssignment(a, id);
  if (!CHALLENGE_IDS.includes(id as ChallengeId))
    throw Error("Unsupported challenge.");
  if (id === "fund_account_002" || id === "wallet_verify_001")
    return { assignment_id: a.assignmentId };
  const clean = hash.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(clean))
    throw Error(
      "Enter the 64-character transaction hash from Stellar Testnet.",
    );
  return { assignment_id: a.assignmentId, transaction_hash: clean };
}
export function normalizeResult(value: unknown): VerificationResult {
  const d = value as Record<string, unknown>;
  if (
    !d ||
    !["VERIFIED", "FAILED", "PENDING", "DUPLICATE"].includes(String(d.status))
  )
    throw Error(
      "Invalid verification result. Refresh history to check your submission.",
    );
  const rawChecks = d.checks ?? d.verification_details ?? {};
  const checks: VerificationResult["checks"] = {};
  if (rawChecks && typeof rawChecks === "object")
    for (const [k, v] of Object.entries(rawChecks))
      if (v === null || ["boolean", "string", "number"].includes(typeof v))
        checks[k] = v as boolean | string | number | null;
  return {
    status: d.status as VerificationResult["status"],
    submissionId:
      typeof (d.submissionId ?? d.id ?? d.submission_id) === "string"
        ? String(d.submissionId ?? d.id ?? d.submission_id)
        : undefined,
    failureReason:
      typeof (d.failureReason ?? d.failure_reason ?? d.message) === "string"
        ? String(d.failureReason ?? d.failure_reason ?? d.message)
        : undefined,
    checks,
    explorerUrl: typeof d.explorer_url === "string" ? d.explorer_url : null,
    completedAt:
      typeof (d.completedAt ?? d.created_at) === "string"
        ? String(d.completedAt ?? d.created_at)
        : undefined,
  };
}
export async function submitEvidence(
  id: string,
  a: Assignment,
  hash: string,
  token: string,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  try {
    return normalizeResult(
      await apiRequest(`/challenges/${encodeURIComponent(id)}/submit`, {
        token,
        body: submissionBody(a, id, hash),
        signal,
      }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 422)
      return normalizeResult(e.payload);
    if (e instanceof ApiError && e.status === 409)
      return { status: "DUPLICATE", failureReason: e.message, checks: {} };
    throw e;
  }
}
export async function historyResult(
  id: string,
  token: string,
  signal?: AbortSignal,
): Promise<VerificationResult | null> {
  const data = (await apiRequest("/students/me/history", {
    token,
    signal,
  })) as { submissions?: Record<string, unknown>[] };
  if (!Array.isArray(data?.submissions))
    throw Error("Invalid history response.");
  const row = data.submissions.find(
    (s) => s.id === id || s.submission_id === id,
  );
  return row ? normalizeResult(row) : null;
}
