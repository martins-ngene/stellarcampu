import { Brand } from "./icons";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <p>Learn by building. Verify through on-chain activity.</p>
            <span className="footer-testnet">
              <i />
              Stellar Testnet only
            </span>
          </div>
          <div className="footer-links">
            <div>
              <h2>Explore</h2>
              <a href="#how-it-works">How it works</a>
              <a href="#challenges">Challenges</a>
              <a href="#soroban">Soroban preview</a>
            </div>
            <div>
              <h2>The platform</h2>
              <span>Stellar + Soroban</span>
              <span>Test funds only</span>
              <span>No Mainnet</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 StellarCampus</p>
          <p>Learn by building on Stellar Testnet.</p>
        </div>
      </div>
    </footer>
  );
}
