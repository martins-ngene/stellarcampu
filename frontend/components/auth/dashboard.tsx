import Link from "next/link";
import { Icon, type IconName } from "@/components/landing/icons";
import {
  chooseNextChallenge,
  challengeState,
  latestSubmission,
  categoryProgress,
  orderedHistory,
  shortReference,
} from "@/lib/dashboard";
import {
  safeExplorer,
  type LiveChallenge,
  type LiveProgress,
  type LiveSubmission,
} from "@/lib/api/student";
import type { LiveUser } from "@/lib/api/auth";
export function DashboardBadge({ status }: { status: string }) {
  return (
    <span
      className={`ds-badge ds-status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      {status}
    </span>
  );
}
const categoryLabels: Record<string, string> = {
  "Wallet & Account": "Wallet & Account",
  "Stellar Payments": "Stellar Payments",
  "Stellar Assets": "Stellar Assets",
  "Soroban Smart Contracts": "Soroban Contracts",
};
const icons: Record<string, IconName> = {
  "Wallet & Account": "wallet",
  "Stellar Payments": "send",
  "Stellar Assets": "arrow",
  "Soroban Smart Contracts": "code",
};
export function DeveloperProgress({
  progress,
  challenges,
}: {
  progress: LiveProgress;
  challenges: LiveChallenge[];
}) {
  const { summary } = progress;
  const percent = Math.min(100, Math.max(0, summary.overall_progress_percent));
  return (
    <section className="ds-card ds-progress">
      <h2>Developer progress</h2>
      <div className="ds-progress-summary">
        <div
          className="ds-ring"
          role="progressbar"
          aria-label="Verified challenge completion"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="ds-ring-track" cx="50" cy="50" r="44" />
            <circle
              className="ds-ring-fill"
              cx="50"
              cy="50"
              r="44"
              pathLength="100"
              strokeDasharray={`${percent} 100`}
            />
          </svg>
          <strong>{Math.round(percent)}%</strong>
        </div>
        <p>
          <strong>
            {summary.verified_challenges} of {summary.total_challenges}
          </strong>
          <span>challenges verified</span>
        </p>
      </div>
      <dl className="ds-categories">
        {categoryProgress(challenges).map((c) => (
          <div key={c.category}>
            <dt>{categoryLabels[c.category] ?? c.category}</dt>
            <dd>
              {c.verified}/{c.total}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function Dashboard({
  user,
  progress,
  challenges,
  history,
}: {
  user: LiveUser;
  progress: LiveProgress;
  challenges: LiveChallenge[];
  history: LiveSubmission[];
}) {
  const { summary } = progress;
  const next = chooseNextChallenge(challenges, history);
  const recent = orderedHistory(history);
  const last = next ? latestSubmission(next, history) : undefined;
  const state = next ? challengeState(next, history) : "VERIFIED";
  const available = challenges
    .filter((c) => c.status !== "COMPLETED" && c.status !== "LOCKED")
    .slice(0, 3);
  const verified = recent
    .filter(
      (s, i, list) =>
        s.status === "VERIFIED" &&
        list.findIndex(
          (other) =>
            other.status === "VERIFIED" &&
            (s.challenge_id
              ? other.challenge_id === s.challenge_id
              : other.challenge_title === s.challenge_title),
        ) === i,
    )
    .slice(0, 4);
  const countCategories = new Set(challenges.map((c) => c.category)).size;
  return (
    <div className="ds-dashboard">
      <header className="ds-page-heading">
        <div>
          <h1>Welcome back, {user.displayName.split(" ")[0]}</h1>
          <p>
            Pick up where you left off. Progress comes from verified on-chain
            evidence.
          </p>
        </div>
        <span className="ds-badge ds-network">Stellar Testnet</span>
      </header>
      <section className="ds-stats" aria-label="Challenge summary">
        {[
          {
            label: "Total challenges",
            value: summary.total_challenges,
            note: `Across ${countCategories} categories`,
            color: "total",
          },
          {
            label: "Verified",
            value: summary.verified_challenges,
            note: "Confirmed on-chain",
            color: "verified",
          },
          {
            label: "Pending",
            value: summary.pending_submissions,
            note: "Awaiting verification",
            color: "pending",
          },
          {
            label: "Failed",
            value: summary.failed_submissions,
            note: "Ready to retry",
            color: "failed",
          },
        ].map((stat) => (
          <article
            className={`ds-card ds-stat ds-stat-${stat.color}`}
            key={stat.label}
          >
            <p>
              {stat.color !== "total" && <i />}
              {stat.label}
            </p>
            <strong>{stat.value}</strong>
            <span>{stat.note}</span>
          </article>
        ))}
      </section>
      <div className="ds-feature-grid">
        <section className="ds-card ds-continue">
          <div className="ds-section-top">
            <p className="ds-eyebrow">
              {next
                ? "Pick up where you left off"
                : "Your work, verified on-chain"}
            </p>
            <DashboardBadge status={state} />
          </div>
          <h2>{next?.title ?? "You’ve completed every challenge."}</h2>
          <p className="ds-continue-description">
            {next
              ? state === "FAILED"
                ? (last?.failure_reason ??
                  "Your last submission needs another look. Review the assigned parameters, then try again.")
                : state === "PENDING"
                  ? "Your submission is awaiting verification. Check its status before sending another transaction."
                  : next.description
              : "All five practical skills, backed by real evidence. Explore your technical activity and see everything you’ve built."}
          </p>
          <div className="ds-operation">
            <code>
              {next
                ? next.category === "Stellar Payments"
                  ? "XLM payment → assigned destination"
                  : next.category === "Stellar Assets"
                    ? "Asset transfer → assigned destination"
                    : next.category === "Soroban Smart Contracts"
                      ? "complete_challenge(student, 5, nonce)"
                      : "Stellar Testnet → verified wallet"
                : `${summary.verified_challenges} / ${summary.total_challenges} challenges verified`}
            </code>
          </div>
          <div className="ds-continue-actions">
            <Link
              className="ds-primary"
              href={next ? `/portal/challenges/${next.id}` : "/portal/history"}
            >
              {next ? "Continue Challenge" : "View your evidence"}
              <Icon name="arrow" />
            </Link>
            <span>
              {next
                ? state === "FAILED"
                  ? "Retry needed · not completed"
                  : state === "PENDING"
                    ? "Awaiting network verification"
                    : "Ready when you are"
                : "Keep a record of what you can build."}
            </span>
          </div>
        </section>
        <DeveloperProgress progress={progress} challenges={challenges} />
      </div>
      <div className="ds-lists-grid">
        <section className="ds-card ds-available">
          <div className="ds-section-top">
            <h2>Available challenges</h2>
            <Link href="/portal/challenges">View all</Link>
          </div>
          <div className="ds-challenge-list">
            {available.length ? (
              available.map((c) => {
                const status = challengeState(c, history);
                return (
                  <article className="ds-challenge-row" key={c.id}>
                    <span className="ds-icon-box">
                      <Icon name={icons[c.category] ?? "arrow"} />
                    </span>
                    <div>
                      <h3>{c.title}</h3>
                      <p>
                        {c.category.replace("Stellar ", "")} · {c.difficulty}
                      </p>
                    </div>
                    <DashboardBadge status={status} />
                    <Link
                      className={`ds-row-action ${status === "PENDING" ? "ds-row-primary" : ""}`}
                      href={`/portal/challenges/${c.id}`}
                    >
                      {status === "FAILED"
                        ? "Retry"
                        : status === "NOT STARTED"
                          ? "Start"
                          : "Continue"}
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="ds-empty">
                <span className="ds-icon-box">
                  <Icon name="check" />
                </span>
                <h3>Every challenge verified</h3>
                <p>
                  Your next step is to share the evidence of what you can build.
                </p>
                <Link href="/portal/profile">
                  View developer profile <Icon name="arrow" />
                </Link>
              </div>
            )}
          </div>
        </section>
        <section className="ds-card ds-recent">
          <h2>Recent submissions</h2>
          <div>
            {recent.length ? (
              recent.slice(0, 3).map((s, i) => {
                const id = s.id ?? s.submission_id;
                return (
                  <article className="ds-submission-row" key={id ?? i}>
                    <div>
                      {id ? (
                        <Link
                          href={`/portal/submissions/${encodeURIComponent(id)}`}
                        >
                          {s.challenge_title}
                        </Link>
                      ) : (
                        <h3>{s.challenge_title}</h3>
                      )}
                      <p>
                        {id ? shortReference(id) : "Submission"}
                        {s.tx_hash ? ` · ${shortReference(s.tx_hash)}` : ""}
                      </p>
                      {s.failure_reason && (
                        <span className="ds-submission-reason">
                          {s.failure_reason}
                        </span>
                      )}
                    </div>
                    <DashboardBadge status={s.status} />
                  </article>
                );
              })
            ) : (
              <div className="ds-empty">
                <p>
                  No submissions yet. Complete your first challenge to start
                  your record.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="ds-card ds-activity">
        <h2>Verified technical activity</h2>
        <div className="ds-activity-grid">
          {verified.length ? (
            verified.map((s, i) => {
              const url = safeExplorer(s.explorer_url);
              const id = s.id ?? s.submission_id;
              return (
                <article key={id ?? i}>
                  <span className="ds-activity-check">
                    <Icon name="check" />
                  </span>
                  <div>
                    <h3>{s.challenge_title}</h3>
                    <p>
                      {s.tx_hash ? shortReference(s.tx_hash) : "Signed proof"}
                      {s.created_at ? ` · ${s.created_at.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      Explorer <Icon name="external" />
                    </a>
                  ) : id ? (
                    <Link
                      href={`/portal/submissions/${encodeURIComponent(id)}`}
                    >
                      View proof <Icon name="arrow" />
                    </Link>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="ds-muted">
              Only successfully verified evidence appears in your technical
              record.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
