"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api/client";
import {
  parseChallenges,
  parseProgress,
  safeExplorer,
  type LiveChallenge,
  type LiveProgress,
  type LiveSubmission,
} from "@/lib/api/student";
import { useLiveAuth } from "./provider";
import { LiveChallengeWorkspace, LiveSubmissionDetail } from "./challenge";
import { WorkspaceFrame } from "./workspace-frame";
import { Dashboard, DeveloperProgress } from "./dashboard";
import { ChallengeIntroduction } from "./learning-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveFrame } from "./screens";

type Data = {
  progress: LiveProgress;
  challenges: LiveChallenge[];
  history: LiveSubmission[];
};
export function LivePortal() {
  const auth = useLiveAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [openedChallenge, setOpenedChallenge] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const session = auth.session;
  useEffect(() => {
    if (auth.ready && !session) router.replace("/signin");
  }, [auth.ready, session, router]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [progress, catalog, history] = await Promise.all([
          apiRequest("/students/me/progress", {
            token: session!.token,
            signal: controller.signal,
          }),
          apiRequest("/challenges", {
            token: session!.token,
            signal: controller.signal,
          }),
          apiRequest("/students/me/history", {
            token: session!.token,
            signal: controller.signal,
          }),
        ]);
        const rows = (history as { submissions: LiveSubmission[] })
          ?.submissions;
        if (!Array.isArray(rows))
          throw Error("Invalid submission history. Please try again.");
        const parsed = {
          progress: parseProgress(progress),
          challenges: parseChallenges(catalog),
          history: rows,
        };
        if (!controller.signal.aborted) {
          setData(parsed);
          setError("");
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          auth.clear();
          router.replace("/signin");
          return;
        }
        setError(
          e instanceof Error ? e.message : "Cannot load your workspace.",
        );
      }
    }
    void load();
    return () => controller.abort();
    // Session identity and route changes invalidate all live data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pathname, retry]);
  if (!session)
    return (
      <LiveFrame>
        <p role="status">Sign in with your wallet to continue…</p>
      </LiveFrame>
    );
  const section = pathname.split("/")[2] || "dashboard";
  const challengeId = pathname.split("/")[3];
  const selected = data?.challenges.find((c) => c.id === challengeId);
  function signOut() {
    auth.clear();
    router.push("/signin");
  }
  return (
    <WorkspaceFrame user={session.user} onSignOut={signOut}>
      {!["dashboard", "challenges"].includes(section) && (
        <header className="ds-page-heading">
          <div>
            <h1>
              {section === "dashboard"
                ? `Keep building, ${session.user.displayName}.`
                : section === "challenges"
                  ? (selected?.title ?? "Available challenges")
                  : section === "history"
                    ? "Submission history"
                    : section === "progress"
                      ? "Your verified progress"
                      : section === "wallet"
                        ? "Connected wallet"
                        : section === "profile"
                          ? "Your developer profile"
                          : section === "settings"
                            ? "Settings"
                            : "Verification details"}
            </h1>
          </div>
          <span className="ds-badge ds-network">Stellar Testnet</span>
        </header>
      )}

      {error ? (
        <div className="p-note">
          <p role="alert">{error}</p>
          <button
            className="p-button p-secondary"
            onClick={() => setRetry((v) => v + 1)}
          >
            Retry loading
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading your authoritative API data…</p>
      ) : (
        <>
          {section === "dashboard" && (
            <Dashboard
              user={session.user}
              progress={data.progress}
              challenges={data.challenges}
              history={data.history}
            />
          )}
          {["progress"].includes(section) && (
            <>
              <DeveloperProgress
                progress={data.progress}
                challenges={data.challenges}
              />
              <p className="p-field-help">
                Counts come from the API. Pending and failed evidence do not
                earn completion.
              </p>
            </>
          )}
          {["challenges"].includes(section) && (
            <>
              {challengeId && selected && openedChallenge !== challengeId ? (
                <ChallengeIntroduction
                  challenge={selected}
                  user={session.user}
                  challenges={data.challenges}
                  onStart={() => setOpenedChallenge(challengeId)}
                />
              ) : challengeId ? (
                <LiveChallengeWorkspace
                  key={challengeId}
                  id={challengeId}
                  session={session}
                  onVerified={() => setRetry((v) => v + 1)}
                />
              ) : (
                <div className="p-live-grid">
                  {data.challenges.map((c) => (
                    <article className="p-panel" key={c.id}>
                      <p className="p-eyebrow">
                        {c.category} · {c.difficulty}
                      </p>
                      <h2>{c.title}</h2>
                      <p>{c.description}</p>
                      <p className="p-field-help">
                        {c.status === "COMPLETED"
                          ? "Completed · API verified"
                          : c.status}
                      </p>
                      <Link
                        href={`/portal/challenges/${encodeURIComponent(c.id)}`}
                      >
                        View challenge →
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {["history", "progress"].includes(section) && (
            <section className="p-live-list">
              <h2>
                {section === "submissions"
                  ? "Submission record"
                  : "Recent submissions"}
              </h2>
              {data.history.length ? (
                data.history
                  .filter(
                    (s) =>
                      section !== "submissions" ||
                      s.id === challengeId ||
                      s.submission_id === challengeId,
                  )
                  .map((s, i) => (
                    <article
                      className="p-panel"
                      key={s.id ?? s.submission_id ?? i}
                    >
                      <h3>{s.challenge_title}</h3>
                      <p>{s.status}</p>
                      {(s.id ?? s.submission_id) && (
                        <Link
                          href={`/portal/submissions/${encodeURIComponent(s.id ?? s.submission_id!)}`}
                        >
                          View verification details →
                        </Link>
                      )}
                      {s.failure_reason && <p>{s.failure_reason}</p>}
                      {s.created_at && (
                        <p className="p-field-help">{s.created_at}</p>
                      )}
                      {safeExplorer(s.explorer_url) && (
                        <a
                          href={safeExplorer(s.explorer_url)!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on Stellar Explorer ↗
                        </a>
                      )}
                    </article>
                  ))
              ) : (
                <p>No submissions yet. Your verified work will appear here.</p>
              )}
            </section>
          )}
          {section === "submissions" && challengeId && (
            <LiveSubmissionDetail
              key={challengeId}
              id={challengeId}
              session={session}
            />
          )}
          {section === "profile" && (
            <section className="p-panel p-registration">
              <h2>{session.user.displayName}</h2>
              <p>@{session.user.username}</p>
              <p>{session.user.email}</p>
              <p className="p-field-help">
                Profile editing and learning-path persistence are awaiting
                backend endpoints.
              </p>
            </section>
          )}
          {section === "settings" && (
            <section className="ds-card ds-settings">
              <h2>Workspace preferences</h2>
              <div>
                <div>
                  <h3>Appearance</h3>
                  <p>Switch between light and dark mode.</p>
                </div>
                <ThemeToggle />
              </div>
              <div>
                <div>
                  <h3>Connected wallet</h3>
                  <p>Manage your Freighter connection.</p>
                </div>
                <Link href="/portal/wallet">Manage wallet →</Link>
              </div>
              <div>
                <div>
                  <h3>Account session</h3>
                  <p>Sign out of your current workspace.</p>
                </div>
                <button className="p-button p-secondary" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </section>
          )}
          {section === "wallet" && (
            <section className="p-panel p-registration">
              <h2>Freighter · ownership verified</h2>
              <p className="p-live-address">{session.user.stellarAddress}</p>
              <p>
                To use another account, sign out and reconnect. This live
                session is kept in memory.
              </p>
              <button className="p-button p-secondary" onClick={signOut}>
                Disconnect and sign out
              </button>
            </section>
          )}
        </>
      )}
    </WorkspaceFrame>
  );
}
