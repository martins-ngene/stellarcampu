"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./icons";

const previews = {
  welcome: {
    icon: "wallet",
    eyebrow: "Your journey starts here",
    title: "A wallet. Five challenges. Real skills.",
    description:
      "Learn Stellar by doing: verify your wallet, fund a Testnet account, send XLM, transfer an asset, and invoke a Soroban contract.",
    steps: [
      "Connect a supported Stellar wallet, such as Freighter.",
      "Sign a message to prove that the wallet belongs to you.",
      "Complete challenges on Testnet and build your verified portfolio.",
    ],
    note: "Connect Freighter and sign a message to start your Testnet challenges.",
    action: "Explore the challenges",
    href: "#challenges",
  },
  wallet: {
    icon: "wallet",
    eyebrow: "Challenge 01 · Beginner · 5 min",
    title: "Verify your wallet",
    description:
      "Your first step on-chain starts with proving ownership of your Stellar wallet.",
    steps: [
      "Choose a supported Stellar wallet.",
      "Request a unique, time-limited verification message.",
      "Sign the message with your wallet to verify ownership.",
    ],
    note: "Preview only. Signing a message proves ownership; it does not send funds or reveal your private key.",
    action: "See how it works",
    href: "#how-it-works",
  },
  payment: {
    icon: "send",
    eyebrow: "Stellar Payments · Beginner · 15 min",
    title: "Send an XLM payment",
    description:
      "Build a real payment on the Stellar Testnet, then submit evidence of your transaction.",
    steps: [
      "Fund your Testnet account with free test XLM.",
      "Send the assigned amount to the assigned destination, including your unique memo.",
      "Submit your transaction hash for network verification.",
    ],
    note: "Preview only. This challenge uses Testnet funds with no monetary value.",
    action: "Explore verification",
    href: "#verification",
  },
  asset: {
    icon: "asset",
    eyebrow: "Stellar Assets · Intermediate · 20 min",
    title: "Transfer an asset",
    description:
      "Go beyond XLM and learn how issued assets move across Stellar.",
    steps: [
      "Establish a trustline for the supported CAMPUS test asset.",
      "Claim test tokens and send the assigned asset payment with your unique memo.",
      "Verify the issuer, asset, amount, destination, and transaction memo.",
    ],
    note: "Preview only. Asset parameters come from your active Testnet assignment.",
    action: "Explore verification",
    href: "#verification",
  },
  soroban: {
    icon: "code",
    eyebrow: "Soroban · Intermediate · 30 min",
    title: "Your first contract interaction",
    description:
      "Invoke a real Soroban contract and prove the resulting on-chain state.",
    steps: [
      "Start a challenge to receive your assigned Testnet contract and evidence nonce.",
      "Authorize the contract invocation using your Stellar wallet.",
      "Submit your transaction hash to verify the invocation and emitted event.",
    ],
    note: "Preview only. The landing-page code panel illustrates the concept; live calls follow the assigned contract interface.",
    action: "See your proof of progress",
    href: "#progress",
  },
  verification: {
    icon: "verified",
    eyebrow: "On-chain evidence",
    title: "Real work. Verifiable results.",
    description:
      "StellarCampus checks authoritative network data against the parameters of your challenge assignment.",
    steps: [
      "Confirm that the transaction exists and succeeded on Stellar Testnet.",
      "Match your source wallet, destination, amount, asset, and assigned memo or nonce.",
      "Receive a clear breakdown of checks and understand what passed or needs a retry.",
    ],
    note: "The network activity shown on this page is illustrative. Verification runs against real network data in the connected application.",
    action: "Explore the challenges",
    href: "#challenges",
  },
} satisfies Record<
  string,
  {
    icon: IconName;
    eyebrow: string;
    title: string;
    description: string;
    steps: string[];
    note: string;
    action: string;
    href: string;
  }
>;

type PreviewKey = keyof typeof previews;

export function PreviewController() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<PreviewKey>("welcome");
  useEffect(() => {
    function open(event: MouseEvent) {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-preview]")
          : null;
      const key = target?.dataset.preview;
      if (!target || !key || !(key in previews)) return;
      event.preventDefault();
      opener.current = target;
      setSelected(key as PreviewKey);
      dialog.current?.showModal();
    }
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);
  const preview = previews[selected];
  function close() {
    dialog.current?.close();
  }
  function restoreFocus() {
    const target = opener.current;
    if (target?.getClientRects().length) target.focus();
    else document.getElementById("mobile-menu-toggle")?.focus();
  }
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex="0"]',
      ),
    ).filter((control) => control.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <dialog
      ref={dialog}
      className="preview-dialog"
      aria-labelledby="preview-title"
      aria-describedby="preview-description"
      onKeyDown={containFocus}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onClose={restoreFocus}
    >
      <div className="dialog-content">
        <button
          className="dialog-close"
          aria-label="Close preview"
          autoFocus
          onClick={close}
        >
          <Icon name="close" />
        </button>
        <span className="dialog-icon">
          <Icon name={preview.icon} />
        </span>
        <p className="eyebrow">{preview.eyebrow}</p>
        <h2 id="preview-title">{preview.title}</h2>
        <p id="preview-description" className="dialog-description">
          {preview.description}
        </p>
        <ol className="dialog-steps">
          {preview.steps.map((step, index) => (
            <li key={step}>
              <span>0{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <p className="dialog-note">{preview.note}</p>
        <a
          className="button button-primary"
          href={preview.href}
          onClick={close}
        >
          {preview.action}
          <Icon name="arrow" />
        </a>
      </div>
    </dialog>
  );
}
