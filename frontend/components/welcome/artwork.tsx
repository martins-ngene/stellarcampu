import { Icon } from "@/components/landing/icons";

function Coin({ className = "" }: { className?: string }) {
  return (
    <div className={`welcome-coin ${className}`}>
      <span>
        <Icon name="stellar" />
      </span>
    </div>
  );
}

export function WelcomeArtwork({ step }: { step: number }) {
  return (
    <div className={`welcome-art welcome-art-${step}`} aria-hidden="true">
      <div className="welcome-disc" />
      <div className="welcome-orbit">
        <i />
        <i />
        <i />
      </div>
      {step === 0 && (
        <>
          <div className="welcome-wallet">
            <div className="welcome-wallet-back" />
            <div className="welcome-wallet-face">
              <svg viewBox="0 0 180 50">
                <path
                  d="M5 28Q23 -5 45 28T85 28T125 28T165 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="welcome-wallet-clasp">●</span>
            </div>
          </div>
          <div className="welcome-check">
            <Icon name="check" />
          </div>
          <Coin />
          <div className="welcome-address">
            <b />
            GDQP…4TXA
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <div className="welcome-editor">
            <div className="welcome-editor-bar">● ●</div>
            <div className="welcome-code-lines">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n}>
                  <i />
                  <i />
                </div>
              ))}
            </div>
          </div>
          <Coin />
          <div className="welcome-star">★</div>
          <div className="welcome-payment">
            <strong>
              Send 2 XLM <Icon name="check" />
            </strong>
            <small>memo SC-4F2A91</small>
            <span />
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <svg className="welcome-shield" viewBox="0 0 260 330">
            <path
              d="M130 8 248 52v110c0 77-49 131-118 160C61 293 12 239 12 162V52Z"
              fill="var(--welcome-shield)"
              stroke="#2bcb99"
              strokeWidth="4"
            />
            <path
              className="welcome-shield-check"
              d="m70 160 43 43 80-94"
              fill="none"
              stroke="#2bcb99"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Coin />
          <span className="welcome-verified">VERIFIED</span>
          <div className="welcome-evidence">
            <span />
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <i />
                <span />
              </div>
            ))}
          </div>
          <div className="welcome-blocks">
            {[1, 2, 3].map((n) => (
              <span key={n}>
                <i />
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
