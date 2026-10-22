"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brand, Icon } from "@/components/landing/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/api/client";
import { authenticateWallet, parseChallenge } from "@/lib/api/auth";
import { connectFreighter, freighterWallet } from "@/lib/api/freighter";
import { safeChallengeDestination } from "@/lib/auth-navigation";
import { useLiveAuth } from "./provider";

export function LiveFrame({
  children,
  authMode,
}: {
  children: ReactNode;
  authMode?: "signup" | "signin";
}) {
  return (
    <div className="portal-root">
      <header className="p-header">
        <div className="p-header-inner">
          <Brand href="/" />
          <span className="p-header-end">
            {authMode ? (
              <>
                {authMode === "signup" ? "Already a builder?" : "New here?"}{" "}
                <Link href={authMode === "signup" ? "/signin" : "/signup"}>
                  {authMode === "signup" ? "Sign in" : "Create an account"}
                </Link>
              </>
            ) : (
              "Stellar Testnet · live connection"
            )}
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="p-onboarding-main">{children}</main>
    </div>
  );
}
export function LiveAuthScreen({ signup = false }: { signup?: boolean }) {
  const auth = useLiveAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeChallengeDestination(search.get("next"));
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function connect() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const address = await connectFreighter();
      if (abort.signal.aborted) return;
      const challenge = parseChallenge(
        await apiRequest("/auth/challenge", {
          body: { stellar_address: address },
          signal: abort.signal,
        }),
      );
      if (abort.signal.aborted) return;
      auth.begin({
        address,
        challenge,
        ...(signup ? { username: username.trim(), email: email.trim() } : {}),
      });
      router.push(
        `/onboarding/verify${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      );
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Connection failed. Please try again.",
        );
    } finally {
      operation.current = false;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <LiveFrame authMode={signup ? "signup" : "signin"}>
      <div className={`auth-design ${signup ? "auth-signup" : "auth-signin"}`}>
        <section className="auth-intro">
          <div className="auth-mobile-art" aria-hidden="true">
            <div className="auth-art-window">
              <div className="auth-art-toolbar">◆ ◆ ◆</div>
              <div className="auth-art-code">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} style={{ width: `${35 + ((i * 19) % 55)}%` }} />
                ))}
              </div>
            </div>
            <div className="auth-art-coin">
              <Icon name="stellar" />
            </div>
          </div>
          <div className="auth-intro-copy">
            <p className="auth-testnet">✧ Built for the Stellar Testnet</p>
            <h1>
              {signup ? (
                <>
                  Your next chapter
                  <br />
                  starts on-chain.
                </>
              ) : (
                <>
                  Welcome back,
                  <br />
                  builder.
                </>
              )}
            </h1>
            <p>
              {signup
                ? "Create your student developer profile. Connect a wallet. Start turning curiosity into work you can prove."
                : "Connect your Stellar wallet and pick up where you left off. Your next verified challenge is waiting."}
            </p>
          </div>
          <ol className="auth-benefits">
            {[
              [
                "Build real things",
                "Go from your first wallet to payments, assets and Soroban contracts.",
              ],
              [
                "Prove your progress",
                "Complete practical challenges with inspectable, on-chain evidence.",
              ],
              [
                "Make it yours",
                "Bring your work together in a developer profile that grows with you.",
              ],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="auth-terminal">
            <div>
              <span className="auth-terminal-dots">● ● ●</span>
              <span>your_build_journey</span>
            </div>
            <code>$ stellar-campus init --you</code>
            <p>
              No experience required. Just a willingness to build. Test funds,
              real practice.
            </p>
          </div>
        </section>
        <div className="auth-form-column">
          <nav className="p-step-tracker" aria-label="Registration progress">
            <span className="is-current" aria-current="step">
              <i>01</i> Profile &amp; wallet
            </span>
            <hr />
            <span>
              <i>02</i> Verify ownership
            </span>
          </nav>
          <form
            className="p-panel p-registration auth-profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              void connect();
            }}
          >
            <h2>
              {signup ? "Your developer profile" : "Sign in to StellarCampus"}
            </h2>
            <p className="p-form-description">
              {signup
                ? "A few details, then your first connection. * Required"
                : "Connect your wallet, then sign a one-time ownership proof."}
            </p>
            {signup && (
              <>
                <div className="auth-name-fields">
                  <label className="auth-field">
                    Display name
                    <input
                      placeholder="e.g. Amina Patel"
                      autoComplete="name"
                      name="displayName"
                      disabled={busy}
                      aria-describedby="profile-persistence-note"
                    />
                    <small>The name other builders will see.</small>
                  </label>
                  <label className="auth-field">
                    Username *
                    <input
                      required
                      minLength={3}
                      maxLength={32}
                      pattern="[A-Za-z0-9_]+"
                      placeholder="e.g. amina_builds"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      disabled={busy}
                    />
                    <small>Letters, numbers and underscores.</small>
                  </label>
                </div>
                <label className="auth-field">
                  Email address *
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={busy}
                  />
                  <small>
                    For account updates. Not shown on your public profile.
                  </small>
                </label>
                <label className="auth-field">
                  Developer experience level
                  <select
                    name="experience"
                    disabled={busy}
                    defaultValue=""
                    aria-describedby="profile-persistence-note"
                  >
                    <option value="" disabled>
                      Select your experience level
                    </option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                  <small>
                    New to coding, learning to build, or already developing? All
                    welcome. Your selection is not saved to your profile yet.
                  </small>
                </label>
                <label className="auth-field">
                  GitHub profile (optional)
                  <input
                    type="url"
                    placeholder="https://github.com/your-username"
                    name="githubProfile"
                    disabled={busy}
                    aria-describedby="profile-persistence-note"
                  />
                  <small>
                    Give your code a home on your developer profile.
                  </small>
                </label>
                <p
                  id="profile-persistence-note"
                  className="auth-persistence-note"
                >
                  Username and email are saved when you verify. Display name,
                  experience and GitHub can be entered here but are not saved to
                  your profile yet.
                </p>
              </>
            )}
            <div className="p-connect-panel auth-wallet-panel">
              <div className="auth-wallet-heading">
                <span>
                  <Icon name="wallet" />
                </span>
                <div>
                  <h3>Connect your Stellar wallet</h3>
                  <small>NOT CONNECTED</small>
                </div>
              </div>
              <p>
                Your wallet links your profile to the practical challenges you
                complete on Testnet.
              </p>
              <button className="p-button p-primary p-full" disabled={busy}>
                {busy ? "Connecting…" : "Connect Stellar Wallet"}
              </button>
              <small>
                Use Freighter on Stellar Testnet. Next, you’ll sign a challenge
                to prove wallet ownership.
              </small>
            </div>
            {error && (
              <p className="p-live-error" role="alert">
                {error}
              </p>
            )}
            <div className="auth-safe-note">
              <Icon name="check" />
              <div>
                <strong>A safe place to build</strong>
                <p>
                  Stellar Testnet only. No Mainnet or real funds. We never ask
                  for private keys or recovery phrases.
                </p>
              </div>
            </div>
            <p className="p-form-footnote">
              {signup ? "Already a builder?" : "New here?"}{" "}
              <Link href={signup ? "/signin" : "/signup"}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </LiveFrame>
  );
}

export function LiveVerifyScreen() {
  const auth = useLiveAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeChallengeDestination(search.get("next"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const pending = auth.pending;
  useEffect(() => {
    if (auth.ready && !pending)
      router.replace(auth.session ? "/portal" : "/signin");
  }, [auth.ready, pending, auth.session, router]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(pending.challenge.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pending]);
  async function verify() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const session = await authenticateWallet({
        address: pending.address,
        challenge: pending.challenge,
        wallet: freighterWallet,
        verify: (signature) => {
          if (abort.signal.aborted) throw Error("Request cancelled.");
          return apiRequest("/auth/verify", {
            body: {
              stellar_address: pending.address,
              signature,
              ...(pending.username ? { username: pending.username } : {}),
              ...(pending.email ? { email: pending.email } : {}),
            },
            signal: abort.signal,
          });
        },
      });
      if (abort.signal.aborted) return;
      auth.login(session);
      router.replace(
        pending.username
          ? "/portal/challenges/fund_account_002"
          : (next ?? "/portal"),
      );
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      lock.current = false;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  if (!pending)
    return (
      <LiveFrame>
        <p role="status">Preparing your session…</p>
      </LiveFrame>
    );
  return (
    <LiveFrame>
      <div className="auth-design auth-verify">
        <section className="auth-verify-intro">
          <span className="auth-testnet">✧ Built for the Stellar Testnet</span>
          <h1>
            Your wallet. Your
            <br className="auth-desktop-break" /> proof.
          </h1>
          <p className="p-muted">
            One signature connects your developer profile to a wallet you
            control. No payment. No real funds.
          </p>
          <ol className="auth-benefits">
            {[
              [
                "Review the challenge",
                "Check the wallet and the message before you sign.",
              ],
              [
                "Sign in your wallet",
                "Your wallet asks for a signature, not a payment.",
              ],
              [
                "Make your work yours",
                "Ownership proof links future challenge evidence to your profile.",
              ],
            ].map(([title, description], index) => (
              <li key={title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="auth-terminal">
            <div>
              <span className="auth-terminal-dots">●●●</span>
              <span>ownership_proof</span>
            </div>
            <code>$ stellar-campus verify --ownership</code>
            <p>
              Connection opens a session. A verified signature proves control of
              the wallet.
            </p>
          </div>
        </section>
        <div className="auth-form-column">
          <nav className="p-step-tracker" aria-label="Registration progress">
            <span className="is-done">
              <i>01</i> Profile &amp; wallet
            </span>
            <hr />
            <span className="is-current" aria-current="step">
              <i>02</i> Verify ownership
            </span>
          </nav>
          <div className="p-panel p-registration auth-verification-card">
            <h2>Verify wallet ownership</h2>
            <p className="p-muted auth-verify-description">
              Your profile is ready. Sign a one-time challenge to finish
              registration.
            </p>
            <p className="auth-wallet-label">CONNECTED WALLET · TESTNET</p>
            <div className="auth-verify-wallet">
              <div className="auth-connected-row">
                <Icon name="wallet" />
                <span title={pending.address}>
                  {pending.address.slice(0, 6)}…{pending.address.slice(-4)}
                </span>
                <span className="auth-connected-status">● Connected</span>
              </div>
              <p>
                Connection is not proof of ownership. Sign a proof to verify
                control.
              </p>
              <Link
                className="p-button p-secondary p-full"
                href={pending.username ? "/signup" : "/signin"}
                onClick={(e) => {
                  if (busy) {
                    e.preventDefault();
                    return;
                  }
                  auth.clear();
                }}
              >
                Use another wallet
              </Link>
            </div>
            <div className="p-proof-message auth-verify-message">
              <div className="auth-message-heading">
                <strong>Message to sign</strong>
                <span>PREVIEW</span>
              </div>
              <pre>{pending.challenge.message}</pre>
              <p>network: Stellar Testnet</p>
              <p>
                Expires:{" "}
                <time dateTime={pending.challenge.expiresAt}>
                  {pending.challenge.expiresAt}
                </time>
              </p>
              <small>
                This is the exact message your wallet will be asked to sign.
              </small>
            </div>
            <div className="auth-safe-note">
              <Icon name="check" />
              <div>
                <strong>A signature, not a payment</strong>
                <p>
                  Signing proves wallet ownership. It does not send XLM, approve
                  a payment or grant access to your funds.
                </p>
              </div>
            </div>
            {expired && (
              <p role="alert">
                This challenge has expired. Reconnect for a fresh message.
              </p>
            )}
            {error && (
              <p className="p-live-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="p-button p-primary p-full"
              disabled={busy || expired || !!error}
              onClick={() => void verify()}
            >
              {busy
                ? "Waiting for wallet verification…"
                : "Sign & verify ownership"}
            </button>
            <p className="auth-signing-hint">
              Review the request in your wallet. If you decline, you can try
              again.
            </p>
            <Link
              className="p-button p-secondary p-full"
              href={pending.username ? "/signup" : "/signin"}
              onClick={(e) => {
                if (busy) {
                  e.preventDefault();
                  return;
                }
                auth.clear();
              }}
            >
              Back to profile & wallet
            </Link>
            <p className="auth-signing-hint auth-verify-footer">
              Stellar Testnet only. No Mainnet or real funds. Never share
              private keys or recovery phrases.
            </p>
          </div>
        </div>
      </div>
    </LiveFrame>
  );
}
