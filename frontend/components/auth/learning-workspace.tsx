"use client";
import Link from "next/link";
import { Icon } from "@/components/landing/icons";
import { WelcomeArtwork } from "@/components/welcome/artwork";
import type { LiveUser } from "@/lib/api/auth";
import type { LiveChallenge } from "@/lib/api/student";

export function VerifiedWallet({ user }: { user: LiveUser }) {
  return (
    <div className="lw-wallet">
      <div>
        <Icon name="wallet" />
        <code title={user.stellarAddress}>
          {user.stellarAddress.slice(0, 6)}…{user.stellarAddress.slice(-4)}
        </code>
        <span className="ds-badge ds-status-verified">Verified</span>
      </div>
      <p>Wallet ownership verified by signed proof.</p>
    </div>
  );
}
export function ChallengeIntroduction({
  challenge,
  user,
  challenges,
  onStart,
}: {
  challenge: LiveChallenge;
  user: LiveUser;
  challenges: LiveChallenge[];
  onStart(): void;
}) {
  const funding = challenge.id === "fund_account_002";
  const completed = challenges.filter((c) => c.status === "COMPLETED").length;
  const steps = funding
    ? [
        ["Check your network", "Use the verified wallet on Stellar Testnet."],
        [
          "Get free test XLM",
          "Request test funds from Friendbot. No purchase needed.",
        ],
        [
          "Inspect your evidence",
          "Submit your public account address. We’ll check its Testnet funding and link the explorer record.",
        ],
      ]
    : [
        [
          "Review your assignment",
          "Check the exact challenge parameters before signing.",
        ],
        [
          "Complete the operation",
          "Approve the requested action using your Testnet wallet.",
        ],
        [
          "Inspect your evidence",
          "Submit your evidence and review the verification checks.",
        ],
      ];
  return (
    <div className="lw-page">
      <header className="lw-heading lw-challenge-heading">
        <div>
          <p className="p-eyebrow">✓ Onboarding complete</p>
          <h1>You’re ready to build.</h1>
          <p>
            Your profile is set. Your wallet ownership is verified. Now turn
            your practical challenge into on-chain evidence.
          </p>
        </div>
        <div className="lw-art">
          <WelcomeArtwork step={0} />
        </div>
      </header>
      <div className="lw-challenge-grid">
        <section>
          <p className="p-eyebrow">
            Your{" "}
            {funding
              ? "first build / wallet fundamentals"
              : `next build / ${challenge.category}`}
          </p>
          <article className="lw-path is-selected lw-feature">
            <div className="lw-card-top">
              <span className="lw-icon">↗</span>
              <small>
                {String(
                  challenges.findIndex((c) => c.id === challenge.id) + 1,
                ).padStart(2, "0")}{" "}
                / {String(challenges.length).padStart(2, "0")}
              </small>
            </div>
            <p className="p-eyebrow">{challenge.category}</p>
            <h2>{challenge.title}</h2>
            <p>{challenge.description}</p>
            <span className="lw-tag">{challenge.difficulty}</span>
            <footer>
              {challenge.status === "COMPLETED"
                ? "Verified — view your challenge"
                : "Ready when you are"}
              <span>→</span>
            </footer>
          </article>
          <h2>What you’ll do</h2>
          <ol className="auth-benefits lw-steps">
            {steps.map(([title, description], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <button className="p-button p-primary p-full" onClick={onStart}>
            {challenge.status === "COMPLETED"
              ? "Open challenge"
              : "Start challenge"}{" "}
            ↗
          </button>
          <Link
            className="p-button p-secondary p-full"
            href="/portal/challenges"
          >
            Explore all challenges
          </Link>
        </section>
        <aside>
          <div className="auth-terminal">
            <div>
              <span className="auth-terminal-dots">●●●</span>
              <span>student_workspace</span>
            </div>
            <code>$ stellar-campus status</code>
            <p>✓ Developer profile created</p>
            <p>✓ Wallet ownership verified</p>
            <p>✓ Stellar Testnet workspace ready</p>
            <hr />
            <code>setup: complete</code>
            <p>
              challenge evidence:{" "}
              {completed ? `${completed} verified` : "none yet"}
            </p>
          </div>
          <p className="p-eyebrow">Connected wallet · Testnet</p>
          <VerifiedWallet user={user} />
          <div className="lw-progress">
            <h3>
              Your learning starts here{" "}
              <small>
                {completed} / {challenges.length}
              </small>
            </h3>
            <progress value={completed} max={Math.max(1, challenges.length)} />
            <p>
              Challenge progress grows only when your submitted evidence is
              verified.
            </p>
          </div>
          <div className="auth-safe-note">
            <Icon name="check" />
            <div>
              <strong>Testnet is your practice space</strong>
              <p>
                Stellar Testnet only. No Mainnet or real funds. Never share
                private keys or recovery phrases.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
