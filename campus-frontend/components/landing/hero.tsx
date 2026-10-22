import Link from "next/link";
import { Icon } from "./icons";
import { ProgressBar, Reveal } from "./motion";

function HeroArtwork() {
  return (
    <div
      className="hero-artwork"
      aria-label="Illustrative developer progress on Stellar Testnet"
    >
      <div className="orbit orbit-outer" aria-hidden="true">
        <span className="orbit-spinner">
          <i className="orbit-point violet-point" />
        </span>
        <span className="orbit-spinner orbit-spinner-mint">
          <i className="orbit-point mint-point" />
        </span>
      </div>
      <div className="orbit orbit-inner" aria-hidden="true">
        <span className="orbit-spinner orbit-spinner-inner">
          <i className="orbit-point blue-point" />
        </span>
      </div>
      <div className="dashboard-frame">
        <div className="developer-window">
          <div className="window-top">
            <span className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="mono">TESTNET / LIVE</span>
          </div>
          <div className="developer-progress-label">
            <span>Developer progress</span>
            <span className="mint mono">60%</span>
          </div>
          <ProgressBar value={60} className="hero-progress" />
          <ul className="developer-tasks">
            {[
              "Wallet ownership",
              "Fund testnet account",
              "Send XLM payment",
            ].map((task) => (
              <li key={task}>
                <span className="check-circle">
                  <Icon name="check" />
                </span>
                {task}
              </li>
            ))}
            <li className="task-locked">
              <span className="lock-circle">
                <Icon name="lock" />
              </span>
              Transfer asset
            </li>
          </ul>
        </div>
      </div>
      <div className="floating-badge proof-badge">
        <span className="badge-icon green-icon">
          <Icon name="verified" />
        </span>
        <span>
          <small>On-chain proof</small>
          <strong>Verified</strong>
        </span>
      </div>
      <div className="floating-badge soroban-badge">
        <span className="badge-icon purple-icon">
          <Icon name="code" />
        </span>
        <span>
          <small>Soroban task</small>
          <strong>In progress</strong>
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <Reveal>
              <span className="eyebrow-pill">
                <Icon name="sparkle" /> Built for the Stellar Testnet
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 id="hero-heading">
                Learn Stellar by
                <br />
                <span className="gradient-text">building on Stellar.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="hero-description">
                Master blockchain development through practical challenges.
                <br className="desktop-break" /> Connect your wallet, ship real
                transactions, and build a verified on-chain portfolio.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="hero-buttons">
                <Link className="button button-primary" href="/signup">
                  Start building <Icon name="arrow" />
                </Link>
                <a className="button button-secondary" href="#challenges">
                  Explore challenges <Icon name="grid" />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="hero-reassurance">
                <span>
                  <Icon name="check" />
                  No experience required
                </span>
                <span>
                  <Icon name="check" />
                  Real Testnet activity
                </span>
              </div>
            </Reveal>
          </div>
          <Reveal className="hero-artwork-wrap" delay={0.2}>
            <HeroArtwork />
          </Reveal>
        </div>
      </section>
      <div className="ecosystem-strip">
        <div className="container ecosystem-inner">
          <p>Practice on the tools powering the open financial network</p>
          <div className="ecosystem-brands">
            <span>
              <Icon name="stellar" />
              Stellar
            </span>
            <span>
              <Icon name="hexagon" />
              Soroban
            </span>
            <span className="mono ecosystem-testnet">TESTNET</span>
          </div>
        </div>
      </div>
    </>
  );
}
