"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brand, Icon } from "@/components/landing/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { shortReference } from "@/lib/dashboard";
import type { LiveUser } from "@/lib/api/auth";
const links: [string, string, string][] = [
  ["Dashboard", "/portal", "dashboard.svg"],
  ["Challenges", "/portal/challenges", "challenge.svg"],
  ["Submission History", "/portal/history", "round-history.svg"],
  ["Developer Profile", "/portal/profile", "ant-design_user.svg"],
  ["Settings", "/portal/settings", "settings.svg"],
];
function SidebarContent({
  user,
  pathname,
  onNavigate,
  onSignOut,
}: {
  user: LiveUser;
  pathname: string;
  onNavigate?(): void;
  onSignOut(): void;
}) {
  return (
    <>
      <Brand href="/" />
      <nav className="ds-navigation" aria-label="Workspace navigation">
        {links.map(([label, href, icon]) => {
          const active =
            href === "/portal" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              href={href}
              key={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
            >
              <span className="ds-tab-icon" aria-hidden="true" style={{ maskImage: `url(/portal_icons/${icon})`, WebkitMaskImage: `url(/portal_icons/${icon})` }} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="ds-sidebar-bottom">
        <div className="ds-sidebar-tools">
          <ThemeToggle />
          <button type="button" className="ds-signout" onClick={onSignOut}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
        <Link href="/portal/wallet" onClick={onNavigate} className="ds-wallet">
          <span>Connected wallet</span>
          <code>{shortReference(user.stellarAddress)}</code>
          <div>
            <span className="ds-badge ds-status-verified">Verified</span>
            <span className="ds-badge ds-network">Testnet</span>
          </div>
        </Link>
      </div>
    </>
  );
}
export function WorkspaceFrame({
  children,
  user,
  onSignOut,
}: {
  children: ReactNode;
  user: LiveUser;
  onSignOut(): void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      element.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        element.close();
        document.body.style.overflow = previous;
      };
    }
    element.close();
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  const content = { user, pathname, onSignOut };
  return (
    <div className="portal-root ds-workspace">
      <a className="skip-link" href="#workspace-content">
        Skip to dashboard content
      </a>
      <aside className="ds-sidebar">
        <SidebarContent {...content} />
      </aside>
      <header className="ds-mobile-header">
        <Brand href="/" />
        <button
          ref={trigger}
          className="ds-menu-button"
          aria-label="Open workspace navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
      </header>
      <dialog
        className="ds-mobile-drawer"
        ref={dialog}
        aria-label="Workspace navigation menu"
        onCancel={close}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="ds-drawer-content">
          <button
            className="ds-menu-button ds-drawer-close"
            aria-label="Close workspace navigation"
            onClick={close}
          >
            <Icon name="close" />
          </button>
          <SidebarContent
            {...content}
            onNavigate={close}
            onSignOut={() => {
              close();
              onSignOut();
            }}
          />
        </div>
      </dialog>
      <main className="ds-main" id="workspace-content">
        {children}
      </main>
    </div>
  );
}
