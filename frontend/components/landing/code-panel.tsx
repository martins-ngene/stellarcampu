"use client";

import { useInView } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";

type Token = { text: string; color?: string };

const sourceLines: Token[][] = [
  [
    { text: "pub fn", color: "code-pink" },
    { text: " " },
    { text: "complete_challenge", color: "code-blue" },
    { text: "(" },
  ],
  [{ text: " env: Env," }],
  [{ text: " student: Address," }],
  [{ text: " challenge_id: Symbol," }],
  [{ text: ") -> bool {" }],
  [
    { text: " " },
    { text: "student", color: "code-violet" },
    { text: ".require_auth();" },
  ],
  [{ text: " store_completion(env, student, challenge_id);" }],
  [{ text: " " }, { text: "true", color: "code-pink" }],
];

const source = sourceLines
  .map((tokens) => tokens.map((token) => token.text).join(""))
  .join("\n");
let offset = 0;
const lines = sourceLines.map((tokens) => {
  const text = tokens.map((token) => token.text).join("");
  const line = { tokens, text, start: offset };
  offset += text.length + 1;
  return line;
});

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

export function CodePanel() {
  const panel = useRef<HTMLDivElement>(null);
  const inView = useInView(panel, { amount: 0.25 });
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const visibility = useSyncExternalStore<string>(
    subscribeToVisibility,
    () => document.visibilityState,
    () => "server",
  );
  const [typed, setTyped] = useState(0);
  const [paused, setPaused] = useState(false);
  const animate = visibility !== "server" && !reducedMotion;
  const visibleCharacters = animate ? typed : source.length;
  const complete = visibleCharacters === source.length;

  useEffect(() => {
    if (!animate || !inView || paused || visibility !== "visible") return;

    // Short pauses at line breaks and punctuation make the typing feel intentional.
    const previousCharacter = source[typed - 1];
    const delay =
      typed === source.length
        ? 3600
        : typed === 0
          ? 450
          : previousCharacter === "\n"
            ? 190
            : /[,;{]/.test(previousCharacter)
              ? 95
              : 22;
    const timer = window.setTimeout(() => {
      setTyped(typed === source.length ? 0 : typed + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [animate, inView, paused, typed, visibility]);

  return (
    <div
      ref={panel}
      className="code-panel"
      data-state={complete ? "complete" : paused ? "paused" : "typing"}
    >
      <div className="code-window-header">
        <span className="window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono">challenge.rs</span>
        <button
          className="code-playback"
          aria-label={paused ? "Resume code animation" : "Pause code animation"}
          onClick={() => setPaused(!paused)}
          disabled={!animate}
          title={paused ? "Resume animation" : "Pause animation"}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            {paused ? (
              <path d="m6 3 11 7-11 7V3Z" />
            ) : (
              <>
                <rect x="5" y="4" width="3" height="12" rx="1" />
                <rect x="12" y="4" width="3" height="12" rx="1" />
              </>
            )}
          </svg>
        </button>
      </div>
      <div
        className="code-scroll"
        tabIndex={0}
        role="region"
        aria-label="Illustrative Soroban Rust code"
      >
        <pre>
          <code>
            <span className="code-accessible">{source}</span>
            <span aria-hidden="true">
              {lines.map((line, index) => {
                const count = Math.max(
                  0,
                  Math.min(line.text.length, visibleCharacters - line.start),
                );
                const cursor =
                  animate &&
                  visibleCharacters >= line.start &&
                  visibleCharacters <= line.start + line.text.length;
                let remaining = count;
                return (
                  <span className="code-line" key={index}>
                    <span className="line-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="code-line-body">
                      <span className="code-measure">{line.text}</span>
                      <span className="code-line-typed">
                        {line.tokens.map((token, tokenIndex) => {
                          const text = token.text.slice(
                            0,
                            Math.max(0, remaining),
                          );
                          remaining -= token.text.length;
                          return (
                            <span className={token.color} key={tokenIndex}>
                              {text}
                            </span>
                          );
                        })}
                        {cursor && (
                          <span
                            className={`code-cursor${paused ? " is-paused" : ""}`}
                          />
                        )}
                      </span>
                    </span>
                    {"\n"}
                  </span>
                );
              })}
            </span>
          </code>
        </pre>
      </div>
      <div className="code-verification" data-generating={!complete}>
        <span>
          <Icon name={complete ? "verified" : "code"} />
          {complete
            ? "Invocation verified on Testnet"
            : paused
              ? "Code generation paused"
              : "Generating contract…"}
        </span>
        <span
          className="mono"
          style={{ visibility: complete ? "visible" : "hidden" }}
        >
          tx: 82fa...c310
        </span>
      </div>
    </div>
  );
}
