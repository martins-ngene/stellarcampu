"use client";

import { useEffect, useRef, useState } from "react";
import { getProfile, updateProfile, safeExplorer, type StudentProfile } from "@/lib/api/student";
import type { LiveSession } from "@/lib/api/auth";
import { useLiveAuth } from "./provider";

export function ProfileWorkspace({ session }: { session: LiveSession }) {
  const auth = useLiveAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState(session.user.displayName || "");
  const [email, setEmail] = useState(session.user.email || "");
  const [githubProfile, setGithubProfile] = useState(session.user.githubProfile || "");
  const [experienceLevel, setExperienceLevel] = useState<string>(session.user.experienceLevel || "");
  const [learningPath, setLearningPath] = useState<string>(session.user.learningPath || "stellar_core");

  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getProfile(session.token, abort.signal);
        if (!abort.signal.aborted) {
          setProfile(data);
          setDisplayName(data.displayName || "");
          setEmail(data.email || "");
          setGithubProfile(data.githubProfile || "");
          setExperienceLevel(data.experienceLevel || "");
          setLearningPath(data.learningPath || "stellar_core");
        }
      } catch (err: any) {
        if (!abort.signal.aborted) {
          setError(err.message || "Failed to load profile details.");
        }
      } finally {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      abort.abort();
    };
  }, [session.token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateProfile(
        {
          displayName: displayName.trim(),
          email: email.trim(),
          githubProfile: githubProfile.trim() || null,
          experienceLevel: (experienceLevel || null) as any,
          learningPath: learningPath || null,
        },
        session.token
      );

      setProfile(updated);
      setSuccess("Your developer profile has been updated and persisted.");

      // Sync updated user data into auth session context
      auth.updateUser({
        displayName: updated.displayName,
        email: updated.email,
        githubProfile: updated.githubProfile,
        experienceLevel: updated.experienceLevel,
        learningPath: updated.learningPath,
      });
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  const explorerUrl = safeExplorer(
    `https://stellar.expert/explorer/testnet/account/${session.user.stellarAddress}`
  );

  return (
    <div className="profile-workspace">
      <section className="p-panel p-registration" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0" }}>{displayName || session.user.displayName}</h2>
            <p style={{ margin: 0, color: "var(--ds-color-text-muted)" }}>@{session.user.username}</p>
          </div>
          <span className="ds-badge ds-network" style={{ alignSelf: "flex-start" }}>
            Stellar Testnet
          </span>
        </div>

        {loading ? (
          <p role="status">Loading profile details from server…</p>
        ) : (
          <form onSubmit={handleSave} className="auth-profile-form">
            {success && (
              <div
                className="p-note"
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                  marginBottom: "1.25rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                }}
              >
                <p role="status" style={{ margin: 0, fontWeight: 500 }}>
                  ✓ {success}
                </p>
              </div>
            )}

            {error && (
              <div
                className="p-note"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                  marginBottom: "1.25rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                }}
              >
                <p role="alert" style={{ margin: 0 }}>
                  ✕ {error}
                </p>
              </div>
            )}

            <div className="auth-name-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <label className="auth-field">
                Display name
                <input
                  type="text"
                  required
                  placeholder="e.g. Amina Patel"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={saving}
                />
                <small>The name other builders will see on your achievements.</small>
              </label>

              <label className="auth-field">
                Username
                <input
                  type="text"
                  disabled
                  value={session.user.username}
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
                <small>Unique handle tied to your registered account.</small>
              </label>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label className="auth-field">
                Email address
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
                <small>Used for verification and account security notifications.</small>
              </label>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label className="auth-field">
                Developer experience level
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select your experience level</option>
                  <option value="beginner">Beginner — New to Web3 &amp; Stellar</option>
                  <option value="intermediate">Intermediate — Familiar with blockchain &amp; JS/TS</option>
                  <option value="advanced">Advanced — Building dApps &amp; smart contracts</option>
                  <option value="expert">Expert — Core protocol contributor or auditor</option>
                </select>
                <small>Helps customize challenge recommendations.</small>
              </label>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label className="auth-field">
                Preferred learning path
                <select
                  value={learningPath}
                  onChange={(e) => setLearningPath(e.target.value)}
                  disabled={saving}
                >
                  <option value="stellar_core">Stellar Core — Accounts, Trustlines &amp; Cross-Border Payments</option>
                  <option value="smart_contracts">Soroban Smart Contracts — Rust, Wasm &amp; On-Chain State</option>
                  <option value="fintech_integrations">Fintech &amp; Anchors — SEP-24, SEP-31 &amp; Asset Issuance</option>
                  <option value="defi">DeFi &amp; AMMs — Automated Liquidity &amp; DEX Swaps</option>
                </select>
                <small>Your active focus area on the campus dashboard.</small>
              </label>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="auth-field">
                GitHub profile
                <input
                  type="url"
                  placeholder="https://github.com/your-username"
                  value={githubProfile}
                  onChange={(e) => setGithubProfile(e.target.value)}
                  disabled={saving}
                />
                <small>Links your code repositories to your builder proof.</small>
              </label>
            </div>

            <div
              className="auth-wallet-panel"
              style={{
                background: "var(--ds-color-surface-sunken, rgba(255, 255, 255, 0.04))",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Connected Stellar Wallet
              </h4>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  wordBreak: "break-all",
                  margin: "0 0 0.5rem 0",
                  color: "var(--ds-color-primary)",
                }}
              >
                {session.user.stellarAddress}
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.8rem", color: "var(--ds-color-accent)" }}
                >
                  View account on Stellar Expert ↗
                </a>
              )}
            </div>

            <button
              type="submit"
              className="p-button p-primary"
              disabled={saving}
              style={{ minWidth: "160px" }}
            >
              {saving ? "Saving changes…" : "Save changes"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
