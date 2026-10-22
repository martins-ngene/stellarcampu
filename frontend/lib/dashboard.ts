import type { LiveChallenge, LiveSubmission } from "./api/student";
export function orderedHistory(history: LiveSubmission[]): LiveSubmission[] {
  return [...history].sort(
    (a, b) =>
      (Date.parse(b.created_at ?? "") || 0) -
      (Date.parse(a.created_at ?? "") || 0),
  );
}
export function latestSubmission(
  challenge: LiveChallenge,
  history: LiveSubmission[],
): LiveSubmission | undefined {
  return orderedHistory(history).find(
    (s) =>
      s.challenge_id === challenge.id ||
      (!s.challenge_id && s.challenge_title === challenge.title),
  );
}
export function challengeState(
  challenge: LiveChallenge,
  history: LiveSubmission[],
): string {
  if (challenge.status === "COMPLETED") return "VERIFIED";
  return (
    latestSubmission(challenge, history)?.status ??
    (challenge.status === "IN_PROGRESS" ? "IN PROGRESS" : "NOT STARTED")
  );
}
export function chooseNextChallenge(
  challenges: LiveChallenge[],
  history: LiveSubmission[],
): LiveChallenge | null {
  const remaining = challenges.filter(
    (c) => c.status !== "COMPLETED" && c.status !== "LOCKED",
  );
  for (const status of ["FAILED", "PENDING", "IN PROGRESS"]) {
    const found = remaining.find((c) => challengeState(c, history) === status);
    if (found) return found;
  }
  return remaining[0] ?? null;
}
export function categoryProgress(challenges: LiveChallenge[]) {
  return [...new Set(challenges.map((c) => c.category))].map((category) => ({
    category,
    verified: challenges.filter(
      (c) => c.category === category && c.status === "COMPLETED",
    ).length,
    total: challenges.filter((c) => c.category === category).length,
  }));
}
export function shortReference(value: string) {
  return value.length > 16 ? `${value.slice(0, 7)}…${value.slice(-4)}` : value;
}
