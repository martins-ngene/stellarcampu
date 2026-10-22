"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Brand, Icon } from "@/components/landing/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { shouldShowWelcome, WELCOME_STORAGE_KEY } from "@/lib/welcome";
import { WelcomeArtwork } from "./artwork";

const slides = [
  {
    title: (
      <>
        Your next chapter
        <br />
        starts on-chain.
      </>
    ),
    description:
      "Create your student developer profile. Connect a wallet. Start turning curiosity into work you can prove.",
  },
  {
    title: (
      <>
        Pick a challenge.
        <br />
        Run it on Testnet.
      </>
    ),
    description:
      "Practical tasks covering payments, assets and Soroban contracts, each with exact parameters to match.",
  },
  {
    title: (
      <>
        Submit the hash.
        <br />
        Get proof.
      </>
    ),
    description:
      "We check your transaction on-chain and explain exactly why it passed or failed.",
  },
];

export function Welcome({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState(-1);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => {
    let show = true;
    try {
      show = shouldShowWelcome(localStorage.getItem(WELCOME_STORAGE_KEY));
    } catch {
      /* Intro remains usable without storage. */
    }
    const timer = window.setTimeout(
      () => setScreen(show ? 0 : -2),
      show ? 1500 : 0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (screen >= 0) heading.current?.focus();
  }, [screen]);
  function complete(destination: string) {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "complete");
    } catch {
      /* Browsers may block persistence. */
    }
    router.push(destination);
    setScreen(-2);
  }
  if (screen === -2) return children;
  if (screen === -1)
    return (
      <div
        className="welcome-screen welcome-splash"
        role="status"
        aria-label="Welcome to StellarCampus"
      >
        <div className="welcome-splash-content">
          <span className="welcome-logo">
            <Icon name="stellar" />
          </span>
          <h1>
            Stellar<span>Campus</span>
          </h1>
          <p>Learn Stellar by Building on Stellar.</p>
          <div className="welcome-loader" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    );
  return (
    <div className="welcome-screen">
      <header className="welcome-header">
        <Brand href="/" />
        <div>
          <span>
            Already a builder?{" "}
            <Link
              href="/signin"
              onClick={(e) => {
                e.preventDefault();
                complete("/signin");
              }}
            >
              Sign in
            </Link>
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="welcome-main">
        <div className="welcome-copy" key={screen}>
          <nav className="welcome-dots" aria-label="Introduction steps">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to introduction ${index + 1}`}
                aria-current={index === screen ? "step" : undefined}
                onClick={() => setScreen(index)}
              />
            ))}
          </nav>
          <h1 ref={heading} tabIndex={-1}>
            {slides[screen].title}
          </h1>
          <p>{slides[screen].description}</p>
          <div className="welcome-actions">
            <button
              className="button button-primary"
              onClick={() =>
                screen < 2 ? setScreen(screen + 1) : complete("/signup")
              }
            >
              {screen < 2 ? (
                "Next"
              ) : (
                <>
                  Get Started <Icon name="arrow" />
                </>
              )}
            </button>
            <button
              className="button welcome-skip"
              onClick={() => complete("/signup")}
            >
              Skip
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            Step {screen + 1} of 3
          </span>
        </div>
        <WelcomeArtwork step={screen} />
      </main>
    </div>
  );
}
