export type LiveChallenge = {
  id: string;
  title: string;
  description: string;
  status?: string;
  category: string;
  difficulty: string;
  network: string;
  config?: { instructions?: string };
};
export type LiveSubmission = {
  challenge_id?: string;
  tx_hash?: string;
  verification_details?: Record<string, unknown>;
  id?: string;
  submission_id?: string;
  challenge_title: string;
  status: string;
  failure_reason?: string | null;
  created_at?: string;
  explorer_url?: string | null;
};
export type LiveProgress = {
  summary: {
    total_challenges: number;
    verified_challenges: number;
    pending_submissions: number;
    failed_submissions: number;
    overall_progress_percent: number;
  };
  recent_activity: LiveSubmission[];
};
export function parseProgress(value: unknown): LiveProgress {
  const data = value as LiveProgress;
  if (
    !data?.summary ||
    ![
      "total_challenges",
      "verified_challenges",
      "pending_submissions",
      "failed_submissions",
      "overall_progress_percent",
    ].every((k) =>
      Number.isFinite(data.summary[k as keyof LiveProgress["summary"]]),
    ) ||
    !Array.isArray(data.recent_activity)
  )
    throw Error("Invalid progress response. Please try again.");
  return data;
}
export function parseChallenges(value: unknown): LiveChallenge[] {
  const data = value as { challenges: LiveChallenge[] };
  if (
    !Array.isArray(data?.challenges) ||
    !data.challenges.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        typeof c.status === "string",
    )
  )
    throw Error("Invalid challenge catalog. Please try again.");
  return data.challenges;
}
export function safeExplorer(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      ["stellar.expert", "lab.stellar.org"].includes(parsed.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}
import { apiRequest } from "./client";

export type StudentProfile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  githubProfile: string | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | "expert" | null;
  learningPath: string | null;
  stellarAddress: string;
  isVerified: boolean;
  role: string;
  createdAt: string;
  updatedAt?: string;
};

export async function getProfile(
  token: string,
  signal?: AbortSignal,
): Promise<StudentProfile> {
  const data = await apiRequest("/students/me/profile", {
    token,
    signal,
  });
  return data as StudentProfile;
}

export async function updateProfile(
  profile: {
    displayName?: string;
    githubProfile?: string | null;
    experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert" | null;
    learningPath?: string | null;
    email?: string;
  },
  token: string,
  signal?: AbortSignal,
): Promise<StudentProfile> {
  const data = await apiRequest("/students/me/profile", {
    method: "PATCH",
    token,
    body: profile,
    signal,
  });
  return data as StudentProfile;
}
