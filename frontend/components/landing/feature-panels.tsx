import Link from "next/link";
import { Icon } from "./icons";
import { InteractiveCard, ProgressBar, Reveal } from "./motion";
import { CodePanel } from "./code-panel";

export function VerificationFeature() {
  return (
    <section
      id="verification"
      className="section verification-section"
      aria-labelledby="verification-heading"
    >
      <div className="container feature-grid">
        <Reveal>
          <InteractiveCard className="network-panel">
            <div className="panel-heading">
              <h3>Network activity</h3>
              <span className="status-pill">
                <i /> Testnet connected
              </span>
            </div>
            <div className="transaction-card">
              <div className="transaction-header">
                <span className="transaction-icon">
                  <Icon name="send" />
                </span>
                <div>
                  <strong>XLM payment</strong>
                  <span className="mono transaction-hash">a7c2...91f4</span>
                </div>
                <span className="transaction-success">
                  <Icon name="check" />
                  Success
                </span>
              </div>
              <dl className="transaction-details">
                <div>
                  <dt>Amount</dt>
                  <dd>2.0000000 XLM</dd>
                </div>
                <div>
                  <dt>Ledger</dt>
                  <dd>#548219</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>GD5K...Q2XH</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>4.2 sec ago</dd>
                </div>
              </dl>
            </div>
            <div className="network-metrics">
              <div>
                <strong>5</strong>
                <span>Checks passed</span>
              </div>
              <div>
                <strong>1.8s</strong>
                <span>Verify time</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>On-chain</span>
              </div>
            </div>
          </InteractiveCard>
        </Reveal>
        <Reveal delay={0.12} className="feature-copy">
          <p className="eyebrow">Stellar Testnet integration</p>
          <h2 id="verification-heading">
            Real transactions.
            <br />
            Real feedback.
          </h2>
          <p>
            StellarCampus checks authoritative network data to confirm that
            every challenge was completed exactly as assigned.
          </p>
          <ul className="feature-checks">
            {[
              "Validate source, destination, asset, and amount",
              "Inspect the actual operation—not just the transaction hash",
              "Understand why a verification passed or failed",
            ].map((text) => (
              <li key={text}>
                <span className="check-circle">
                  <Icon name="check" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <button
            className="button button-secondary button-verification"
            data-preview="verification"
          >
            Learn about verification <Icon name="external" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export function SorobanFeature() {
  return (
    <section
      id="soroban"
      className="section soroban-section"
      aria-labelledby="soroban-heading"
    >
      <div className="container soroban-grid">
        <Reveal className="feature-copy soroban-copy">
          <span className="eyebrow-pill">
            <Icon name="hexagon" />
            Smart contract challenge
          </span>
          <h2 id="soroban-heading">
            Your first Soroban
            <br />
            interaction
            <br />
            starts here.
          </h2>
          <p>
            Move beyond transactions. Invoke a real contract function, authorize
            it with your wallet, and verify the resulting on-chain state.
          </p>
          <Link
            className="button button-primary"
            href="/portal/challenges/soroban_contract_005"
          >
            Preview Soroban challenge <Icon name="arrow" />
          </Link>
        </Reveal>
        <Reveal delay={0.12}>
          <CodePanel />
        </Reveal>
      </div>
    </section>
  );
}

export function PortfolioFeature() {
  return (
    <section
      id="progress"
      className="portfolio-section"
      aria-labelledby="portfolio-heading"
    >
      <div className="container">
        <Reveal>
          <div className="portfolio-panel">
            <div className="portfolio-copy">
              <p className="eyebrow">Proof of progress</p>
              <h2 id="portfolio-heading">
                Build a portfolio
                <br />
                backed by the
                <br />
                blockchain.
              </h2>
              <p>
                Your profile records verified transactions and contract
                interactions—concrete evidence of what you can build.
              </p>
              <div className="portfolio-stats">
                <div>
                  <strong>05</strong>
                  <span>Core challenges</span>
                </div>
                <div>
                  <strong>100%</strong>
                  <span>Verifiable work</span>
                </div>
              </div>
            </div>
            <div className="profile-card">
              <div className="profile-heading">
                <span className="avatar">AM</span>
                <div className="profile-identity">
                  <h3>Alex Morgan</h3>
                  <p className="mono">GD5K...Q2XH · VERIFIED</p>
                </div>
                <span className="status-pill">
                  <i />
                  Builder level 3
                </span>
              </div>
              <div className="profile-metrics">
                <div>
                  <strong>4</strong>
                  <span>Verified</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>In progress</span>
                </div>
                <div>
                  <strong>8</strong>
                  <span>Transactions</span>
                </div>
              </div>
              <div className="profile-progress-label">
                <span>Challenge progress</span>
                <span className="mint mono">80%</span>
              </div>
              <ProgressBar value={80} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCallToAction() {
  return (
    <section className="cta-section" aria-labelledby="cta-heading">
      <div className="container">
        <Reveal>
          <div className="cta-panel">
            <span className="eyebrow-pill">
              <Icon name="sparkle" />
              Your next skill is on-chain
            </span>
            <h2 id="cta-heading">
              Ready to prove
              <br />
              what you can build?
            </h2>
            <p>
              Join a new generation of Stellar developers learning by doing, one
              verified
              <br className="desktop-break" /> challenge at a time.
            </p>
            <div className="cta-buttons">
              <Link className="button button-primary" href="/signup">
                Start your first challenge <Icon name="arrow" />
              </Link>
              <a className="button button-secondary" href="#challenges">
                Explore challenges
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
