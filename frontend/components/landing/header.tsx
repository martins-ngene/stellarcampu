"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { Brand, Icon } from "./icons";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  ["How it works", "how-it-works"],
  ["Challenges", "challenges"],
  ["Soroban", "soroban"],
  ["Progress", "progress"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function outside(event: globalThis.PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return (
    <header className="site-header" ref={header}>
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, id]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="sign-in" href="/signin">
            Sign in
          </Link>
          <Link className="button button-primary button-small" href="/signup">
            Start building <Icon name="arrow" />
          </Link>
          <ThemeToggle />
        </div>
        <button
          ref={toggle}
          id="mobile-menu-toggle"
          className="menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {links.map(([label, id]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {label}
            <Icon name="arrow" />
          </a>
        ))}
        <Link href="/signin" onClick={() => setOpen(false)}>
          Sign in <Icon name="wallet" />
        </Link>
        <Link href="/signup" onClick={() => setOpen(false)}>
          Start building <Icon name="arrow" />
        </Link>
      </nav>
    </header>
  );
}
