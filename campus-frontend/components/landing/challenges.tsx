import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "./icons";
import { InteractiveCard, Reveal } from "./motion";

const challengeRoutes: Record<string, string> = {
  wallet: "wallet_verify_001",
  payment: "payment_xlm_003",
  asset: "asset_transfer_004",
  soroban: "soroban_contract_005",
};

const steps: { title: string; description: string; icon: IconName }[] = [
  {
    title: "Connect",
    description:
      "Link a supported wallet and securely verify that the public address is yours.",
    icon: "link",
  },
  {
    title: "Build",
    description:
      "Follow a focused challenge and complete a real transaction on Testnet.",
    icon: "terminal",
  },
  {
    title: "Verify",
    description:
      "Submit on-chain evidence. We inspect the transaction, not just the hash.",
    icon: "verified",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section how-section"
      aria-labelledby="how-heading"
    >
      <div className="container">
        <Reveal className="section-heading centered">
          <p className="eyebrow">A practical path forward</p>
          <h2 id="how-heading">Go from curious to on-chain</h2>
          <p>
            No passive tutorials. Every step ends with a real, inspectable piece
            of work
            <br className="desktop-break" /> on the Stellar network.
          </p>
        </Reveal>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.09}>
              <InteractiveCard className="step-card">
                <div className="step-top">
                  <span className="step-icon">
                    <Icon name={step.icon} />
                  </span>
                  <span className="sequence">0{index + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </InteractiveCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const challenges: {
  title: string;
  description: string;
  difficulty: string;
  minutes: number;
  icon: IconName;
  color: string;
  preview: string;
}[] = [
  {
    title: "Verify your wallet",
    description:
      "Connect a Stellar wallet and prove ownership with a signed challenge.",
    difficulty: "Beginner",
    minutes: 5,
    icon: "wallet",
    color: "163, 133, 255",
    preview: "wallet",
  },
  {
    title: "Send an XLM payment",
    description:
      "Build and submit a real payment transaction on the Stellar Testnet.",
    difficulty: "Beginner",
    minutes: 15,
    icon: "send",
    color: "101, 164, 255",
    preview: "payment",
  },
  {
    title: "Transfer an asset",
    description:
      "Move a supported Stellar asset and verify every operation detail.",
    difficulty: "Intermediate",
    minutes: 20,
    icon: "asset",
    color: "77, 213, 166",
    preview: "asset",
  },
  {
    title: "Invoke a Soroban contract",
    description:
      "Call a deployed smart contract and prove the resulting state change.",
    difficulty: "Intermediate",
    minutes: 30,
    icon: "code",
    color: "221, 112, 190",
    preview: "soroban",
  },
];

export function FeaturedChallenges() {
  return (
    <section
      id="challenges"
      className="section challenges-section"
      aria-labelledby="challenges-heading"
    >
      <div className="container">
        <Reveal className="challenge-heading-row">
          <div className="section-heading">
            <p className="eyebrow">Featured challenges</p>
            <h2 id="challenges-heading">Build skills that can be verified</h2>
            <p>
              Five focused challenges take you from your first wallet connection
              to a<br className="desktop-break" /> working smart contract
              interaction.
            </p>
          </div>
          <Link className="text-link violet-link" href="/portal/challenges">
            View all challenges <Icon name="arrow" />
          </Link>
        </Reveal>
        <div className="challenges-grid">
          {challenges.map((challenge, index) => (
            <Reveal key={challenge.preview} delay={index * 0.08}>
              <div
                style={{ "--card-accent": challenge.color } as CSSProperties}
              >
                <InteractiveCard className="challenge-card">
                  <div className="challenge-top">
                    <span className="challenge-icon">
                      <Icon name={challenge.icon} />
                    </span>
                    <span className="sequence">0{index + 1}</span>
                  </div>
                  <div className="challenge-meta">
                    <span>{challenge.difficulty}</span>
                    <span>
                      <Icon name="clock" /> {challenge.minutes} min
                    </span>
                  </div>
                  <h3>{challenge.title}</h3>
                  <p>{challenge.description}</p>
                  <Link
                    className="text-link challenge-action"
                    href={`/portal/challenges/${challengeRoutes[challenge.preview]}`}
                  >
                    Start challenge <Icon name="arrow" />
                  </Link>
                </InteractiveCard>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
