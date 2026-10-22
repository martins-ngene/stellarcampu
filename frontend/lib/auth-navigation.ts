import { CHALLENGE_IDS } from "./api/challenges";

// Only recognized internal challenge destinations may survive authentication.
export function safeChallengeDestination(value: string | null): string | null {
  return CHALLENGE_IDS.some((id) => value === `/portal/challenges/${id}`)
    ? value
    : null;
}
