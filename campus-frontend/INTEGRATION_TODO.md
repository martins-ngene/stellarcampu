# Remaining API Integration Tasks

Status (October 21, 2026): the real-wallet five-challenge happy path passed, with owner-confirmed **5/5 verified, 100% dashboard completion**. That percentage describes the student's challenge progress, not overall release readiness. Evidence: `../docs/integration/2026-10-21-real-wallet-testnet.md`. `../HANDSHAKE.md` remains the integration contract.

Only unfinished work is listed below.

## 1. Deployment and remaining real-wallet acceptance

- [ ] Observe backend cold-start behavior and repeat health checks; the deployed health endpoint now returns HTTP 200 after an initial timeout.
- [ ] Verify CORS from the production frontend origin when deployed; the current `http://localhost:3000` preflight has passed.
- [ ] Verify new-account signup metadata using a fresh wallet, including Friendbot funding for a previously unfunded account.
- [ ] Verify signout, reauthentication, wallet/account switching, rejected signatures and expired challenges with the real extension.
- [ ] Exercise rejected transaction signing, insufficient funds, expired assignments, failed/duplicate evidence and uncertain submission delivery on Testnet; confirm the UI retains transaction references and does not automatically send a second payment.

Real-wallet signing requires the wallet owner to approve prompts. Never provide a secret key or recovery phrase to the application or chat.

## 2. Backend verification and contract gaps — next implementation priority

- [ ] Make authentication nonce consumption transactional/atomic and test concurrent replay attempts.
- [ ] Review new-wallet association by user-supplied email; require appropriate ownership checks before linking a wallet to an existing account.
- [ ] Bind the submit route's challenge ID to the locked assignment's `challengeId`; reject cross-challenge assignment use on the server.
- [ ] Validate the Soroban evidence nonce and transaction freshness against the active assignment. The current verifier receives contract/student/numeric challenge ID, but no assigned nonce.
- [ ] Confirm whether verification remains synchronous. If asynchronous results are supported, agree on authoritative pending counts and polling semantics; current progress hardcodes `pending_submissions: 0`.

## 3. Persistence and session contracts

- [ ] Backend engineer: extend registration/profile persistence to accept display name, GitHub profile URL and developer experience (`beginner`, `intermediate`, `advanced`, `expert`); validate and store them, and return them through authenticated profile read/update endpoints. Display name and GitHub inputs are now editable on signup, but these values are not yet sent or saved.
- [ ] Frontend: connect the editable signup fields and live profile editor to the agreed backend contract, preserve entered values through wallet verification, and verify they survive a profile reload.
- [ ] Agree on learning-path persistence and connect live path selection to it.
- [ ] Add an authenticated active-assignment lookup/resume contract, then restore assignments safely after full reload without resending existing transactions.
- [ ] Agree on refresh/current-user/logout-revocation requirements. Until supported, retain memory-only Bearer sessions and explicit wallet reauthentication after reload/expiry.

## 4. Remaining wallet support

- [ ] Replace format-only Freighter address checks with Stellar checksum validation consistently during connection/signing; test malformed addresses and locked/unavailable extension behavior.
- [ ] Implement and verify live xBull support and a supported mobile-wallet connection/signing flow. These are not enabled in the live-only release.

## 5. Final acceptance

- [ ] Audit loading, empty, unavailable and retry states across all live reads; confirm user/wallet changes cannot expose stale cached records.
- [ ] Complete keyboard/focus, accessibility and hydration checks across live auth/challenge/result screens on desktop/mobile and both themes, including real extension prompts.
- [ ] After fixing issues found in real-wallet tests, rerun unit/HTTP/browser tests, lint, TypeScript and production build; record real Testnet hashes and outcomes in integration evidence without storing credentials.
- [ ] Update HANDSHAKE.md and API.md with the deployed, verified behavior and any resolved backend contracts; remove remaining verification caveats only after real end-to-end checks pass.
