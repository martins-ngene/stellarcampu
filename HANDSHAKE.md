# StellarCampus Frontend Handshake & Integration Guide (`HANDSHAKE.md`)

> **Frontend integration status (October 21, 2026):** Signup/signin now default to a Freighter wallet-signature flow against `NEXT_PUBLIC_API_BASE_URL` (default: the deployed API below). Live sessions keep Bearer tokens in memory and load API catalog, progress and history. Real Freighter login reached the dashboard, and a real Soroban invocation succeeded on Testnet with backend verification confirmed by the wallet owner. The real-wallet happy path now passes all five challenges (owner-confirmed 5/5, 100% dashboard progress); Soroban, XLM and CAMPUS ledger results were independently checked. The portal is live-only: demo entry points, simulated workspaces and the local demo reducer/storage have been removed. Live challenge pages now wire detail/start, Testnet transaction preparation/signing/submission, and verification results; The five-challenge happy path is verified; failure-case and additional-wallet acceptance tests remain open. Profile editing and learning-path persistence remain unimplemented. Track status in `frontend/INTEGRATION_TODO.md`.

Welcome to the **StellarCampus** API and Smart Contract integration guide. This document provides everything the frontend team needs to seamlessly connect the React/Next.js client to the Fastify backend and the deployed Soroban Testnet smart contract.

---

## 1. Network & Environment Parameters

Ensure your client-side Stellar SDK and wallet connectors use the authoritative Testnet parameters:

| Parameter | Value |
| :--- | :--- |
| **Network Passphrase** | `Test SDF Network ; September 2015` |
| **Horizon API** | `https://horizon-testnet.stellar.org` |
| **Soroban RPC URL** | `https://soroban-testnet.stellar.org` |
| **Friendbot URL** | `https://friendbot.stellar.org` |
| **Deployed Soroban Contract ID** | `CA3P7YT764IMXGP7TRLC64KYONLMCRGUJ23GIU646UKOEFSGPVE7UNFK` |
| **Campus Vault / Payment Destination** | `GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV` |
| **CAMPUS Asset Code / Issuer** | `CAMPUS` / `GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV` |
| **Backend API Base URL** | `https://stellarcampus-backend.onrender.com/api` (Live Production) / `http://localhost:3001/api` (Local Dev) |
| **Interactive Swagger Playground** | [`https://stellarcampus-backend.onrender.com/docs`](https://stellarcampus-backend.onrender.com/docs) |
| **Auth Scheme** | `Authorization: Bearer <token>` |

---

## 2. Authentication Flow (Wallet Signature → Bearer Token)

The backend never trusts a raw wallet address supplied in request bodies. Authentication is strictly cryptographic via an ed25519 signature of a dynamic challenge nonce.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Frontend as Web App (Stellar Wallets Kit)
    participant Wallet as Freighter / xBull
    participant API as Fastify Backend (/api/auth)

    Student->>Frontend: Click "Connect Wallet"
    Frontend->>Wallet: Request Public Key (G...)
    Wallet-->>Frontend: Returns Stellar Address

    Frontend->>API: POST /auth/challenge { stellar_address }
    API-->>Frontend: { nonce, message, expires_at }

    Frontend->>Wallet: Request Signature for message
    Wallet->>Student: Prompt to Sign Challenge
    Student->>Wallet: Approve Signature
    Wallet-->>Frontend: Returns base64 Signature

    Frontend->>API: POST /auth/verify { stellar_address, signature }
    API->>API: Verify Ed25519 signature (supports both SEP-53 Freighter & legacy raw)
    API-->>Frontend: { token: "eyJhbGciOi...", user: { id, stellar_address, ... } }
    Frontend->>Frontend: Store Bearer Token (Secure Storage / Memory)
```

> [!NOTE]
> **SEP-53 Wallet Signature Support**: The backend seamlessly handles modern **Freighter SEP-53** standard signatures (`SHA256("Stellar Signed Message:\n" + message)`) as well as legacy raw Ed25519 signatures from custom keypairs or test scripts without requiring any frontend translation.

### Auth Code Example (Client-side)
```typescript
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

// 1. Get challenge nonce
const challengeRes = await fetch(`${API_BASE_URL}/auth/challenge`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stellar_address: publicKey }),
});
const { nonce, message } = await challengeRes.json();

// 2. Sign challenge message using wallet kit
const { signature } = await kit.signMessage(message);

// 3. Exchange for Bearer JWT
const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stellar_address: publicKey,
    signature: signature,
  }),
});
const { token, user } = await verifyRes.json();
localStorage.setItem('sc_bearer_token', token);
```

---

## 3. Challenge Lifecycle & Execution Matrix

Every challenge adheres to a strict state cycle:
```
[Select Challenge] ──> [Start Assignment: POST /challenges/:id/start]
                           │
                           ▼
               [Receive Dynamic Assigned Parameters]
               (Unique Memo / Nonce / Destination)
                           │
                           ▼
               [Execute On-Chain via Wallet / CLI]
                           │
                           ▼
          [Submit TX Hash: POST /challenges/:id/submit]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      { status: "VERIFIED" }     { status: "FAILED" }
```

### Challenge 1 — Wallet Ownership Verification
- **Description**: Proves the student controls the private key corresponding to their Stellar public address.
- **Action**: Completes automatically upon successful execution of the `/api/auth/verify` endpoint.
- **Verification Endpoint**: `POST /api/challenges/wallet_verify_001/submit` with `{ "assignment_id": "<active assignment UUID>" }`; backend confirms active verified wallet status. Start an assignment first; the checked-in route requires its UUID even for wallet ownership.

### Challenge 2 — Fund a Stellar Testnet Account
- **Action**: Student requests test lumens via Stellar Friendbot (`https://friendbot.stellar.org?addr={publicKey}`).
- **Submission**: `POST /api/challenges/fund_account_002/submit` with `{ "assignment_id": "<active assignment UUID>" }` (no TX hash required; backend queries Horizon `/accounts/{publicKey}` to verify balance $\ge 1$ XLM).

### Challenge 3 — Execute an XLM Payment
- **Action**: Student sends assigned amount of XLM to the platform's assigned Testnet address.
- **Crucial Requirement**: The transaction **must** include the `assigned_memo` generated by `POST /api/challenges/payment_xlm_003/start`.
- **Client Construction Example**:
  ```typescript
  import { TransactionBuilder, Networks, Operation, Asset, Memo } from '@stellar/stellar-sdk';

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: assignment.assigned_destination,
        asset: Asset.native(),
        amount: assignment.assigned_amount, // e.g. "2.0000000"
      })
    )
    .addMemo(Memo.text(assignment.assigned_memo)) // Anti-replay memo
    .setTimeout(180)
    .build();
  ```
- **Submission Payload**:
  ```json
  {
    "assignment_id": "assignment-uuid",
    "transaction_hash": "64_char_hex_hash"
  }
  ```

### Challenge 4 — Transfer a Supported Stellar Asset
- **Asset Config**: Asset Code `CAMPUS`, Issuer Address provided in `/challenges/asset_transfer_004` and in active assignment `assigned_parameters.asset_issuer`.
- **Complete End-to-End Frontend Flow**:
  1. **Start Assignment**: Call `POST /api/challenges/asset_transfer_004/start` to retrieve `destination`, `amount`, `asset`, `asset_issuer`, and unique `memo`.
  2. **Establish Trustline**: Prompt user via Freighter to establish a trustline for `CAMPUS`:
     ```typescript
     import { Asset, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
     const campusAsset = new Asset(assignment.assigned_parameters.asset, assignment.assigned_parameters.asset_issuer);
     const tx = new TransactionBuilder(account, { fee: '10000', networkPassphrase })
       .addOperation(Operation.changeTrust({ asset: campusAsset, limit: '1000' }))
       .setTimeout(180)
       .build();
     ```
  3. **Claim Faucet Tokens**: Call `POST /api/challenges/asset_transfer_004/claim-tokens` with Bearer auth. The platform dispenses 20.0 `CAMPUS` directly to the student's wallet on Testnet.
  4. **Execute Asset Payment**: Prompt user via Freighter to transfer 10.0 `CAMPUS` to the assigned destination with the assigned unique memo.
  5. **Authoritative Verification**: Submit transaction hash to `POST /api/challenges/asset_transfer_004/submit`.
- **Submission Payload**: Same as Challenge 3.

### Challenge 5 — Interact with a Soroban Smart Contract
- **Contract Function**: `complete_challenge(student: Address, challenge_id: u32, evidence_nonce: BytesN<32>)`
- **Crucial Requirement**: The invoking wallet must be the student address, authorized via `student.require_auth()`. The `evidence_nonce` is the 32-byte hex nonce provided in the active assignment.
- **Client Invocation**:
  ```typescript
  import { Contract, Address, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';

  const contract = new Contract(assignment.assigned_contract_id);
  const tx = contract.call(
    'complete_challenge',
    new Address(studentAddress).toScVal(),
    nativeToScVal(5, { type: 'u32' }),
    nativeToScVal(Buffer.from(assignment.assigned_nonce, 'hex'), { type: 'bytes' })
  );
  // Sign with wallet and submit to Soroban RPC -> Submit tx_hash to backend
  ```

---

## 4. API Endpoints Reference

All requests requiring authentication must include:
`Authorization: Bearer <token>`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/challenge` | Request unique signing nonce for address |
| `POST` | `/api/auth/verify` | Submit ed25519 signature; returns JWT Bearer token |
| `GET` | `/api/challenges` | List all 5 challenges with completion status for logged-in user |
| `GET` | `/api/challenges/:id` | Get challenge specifications, instructions, config, and active assignment |
| `POST` | `/api/challenges/:id/start` | Generate dynamic assignment (unique memo, nonce, destination, issuer) |
| `POST` | `/api/challenges/:id/claim-tokens` | Dispense 20.0 `CAMPUS` testnet tokens to authenticated student with trustline |
| `POST` | `/api/challenges/:id/submit` | Submit transaction hash for authoritative verification |
| `GET` | `/api/submissions/:id` | Planned; absent in current backend. Read the matching row in `/api/students/me/history` for result details |
| `GET` | `/api/students/me/progress` | Get overall completion progress, verified counts, pending counts |
| `GET` | `/api/students/me/history` | List all past submissions, statuses, and Stellar Explorer URLs |

---

## 5. Standard Data Types (TypeScript)

Copy these types directly into your frontend `types/api.ts`:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  githubUsername?: string;
  stellarAddress: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  category: 'Wallet & Account' | 'Stellar Payments' | 'Stellar Assets' | 'Soroban Smart Contracts';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  network: 'testnet';
  orderIndex: number;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ChallengeAssignment {
  assignmentId: string;
  challengeId: string;
  assignedParameters: {
    destination?: string;
    amount?: string;
    asset?: string;
    assetIssuer?: string;
    memo?: string;
    nonce?: string;
    contractId?: string;
  };
  expiresAt: string;
}

export interface VerificationChecks {
  transaction_exists: boolean;
  transaction_succeeded: boolean;
  source_wallet_matches: boolean;
  destination_matches?: boolean;
  asset_matches?: boolean;
  amount_matches?: boolean;
  memo_matches?: boolean;
  contract_matches?: boolean;
  event_emitted?: boolean;
}

export interface SubmissionResponse {
  submissionId?: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'DUPLICATE';
  failureReason?: string;
  checks?: Record<string, boolean | string | number | null>;
  completedAt?: string;
  explorer_url?: string | null;
}
// History rows use id/challenge_id/failure_reason/verification_details/created_at.
// A 409 duplicate response uses { statusCode, error, message }, without a submissionId.
```

---

## 6. Verification Statuses & UI Handling (Screen 9)

When rendering **Screen 9 (Verification Result)**, the backend returns clear semantic results:

| Status | HTTP Code | UI State & Guidance |
| :--- | :--- | :--- |
| `VERIFIED` | `200 OK` | Render green success banner, display passing checkmarks for all items, trigger celebratory micro-animation, offer "Back to Challenges". |
| `FAILED` | `422 Unprocessable` | Render red/amber error banner. Display `failure_reason` verbatim (e.g. *"The transaction was sent to GABC... but expected GXYZ..."*). Display "Retry Submission" button. |
| `DUPLICATE` | `409 Conflict` | Transaction hash has already been used by another student or in a previous challenge. Prompt student to execute a new transaction with their active assignment parameters. |
| `PENDING` | `202 Accepted` | If network congestion delays Horizon ledger ingestion, the UI should poll for about 10 seconds, then retain PENDING and offer refresh/history. Never mark a submission failed solely because polling timed out. The current checked-in backend is synchronous; this status is supported for future asynchronous responses. |

---

## 7. Live Frontend Portal

Entry routes are `/signup` and `/signin`. Both use the real Freighter wallet-signature flow. Ownership verification uses `/onboarding/verify`. Student routes are `/portal`, `/portal/challenges`, `/portal/challenges/:id`, `/portal/submissions/:id`, `/portal/history`, `/portal/progress`, `/portal/profile`, `/portal/wallet`, and `/portal/settings`. Legacy `/onboarding/path` and `/onboarding/ready` URLs redirect to `/portal`.

The dashboard uses a desktop sidebar and a keyboard-accessible mobile navigation drawer. Summary counts and the progress ring come from API progress; category totals, continuation actions, submission statuses and verified activity derive from the catalog/history. Completed challenges retain their verified state after a failed retry, and a fully completed account sees a completion state. Settings exposes the existing theme preference, wallet details and signout. Both themes support mobile layouts.

The registration UI includes the reference profile fields. Username, email, display name, experience level, and GitHub profile are forwarded on `/auth/verify` and saved directly to the database. Authenticated profile reads and updates are fully supported via `GET /api/students/me/profile` and `PATCH /api/students/me/profile`. The live `ProfileWorkspace` at `/portal/profile` allows students to view and update their display name, email, GitHub profile, developer experience level, and preferred learning path (`stellar_core`, `smart_contracts`, `fintech_integrations`, `defi`).

The portal uses only `LiveAuthProvider` and authenticated API responses. Bearer tokens remain in memory, and signed-out or refreshed sessions require real wallet authentication. Active Freighter address liveness detection automatically clears sessions if the wallet account changes.

The catalog uses the five backend IDs: `wallet_verify_001`, `fund_account_002`, `payment_xlm_003`, `asset_transfer_004`, and `soroban_contract_005`. Only backend-verified evidence earns completion.

## 8. Live Challenge Integration Status (October 22, 2026)

The live frontend uses the camelCase start response (`assignmentId`, `challengeId`, `assignedParameters`, `expiresAt`) and snake_case submit body (`assignment_id`, `transaction_hash`). Assignment expiry and identity are checked before signing/submitting. Active in-progress assignments are dynamically resumed across page reloads via `GET /api/challenges/:id/assignment`.

Freighter signs Testnet transactions for native XLM payments, CAMPUS trustlines/payments and the assigned Soroban call. Friendbot funding and authenticated CAMPUS faucet requests use explicit user actions. A transaction hash is saved before broadcast; ambiguous delivery does not automatically retry payment.

Verification UI preserves 422 failure checks/reasons and 409 duplicate messages. Server-side verification strictly enforces:
1. **Atomic Nonce Consumption & Replay Defense**: Single-use atomic consumption of wallet auth nonces with account hijacking prevention.
2. **Cross-Challenge Assignment Binding**: Server rejects submissions where the locked assignment does not belong to the submitted challenge.
3. **Soroban Evidence Nonce & Freshness Verification**: Validates on-chain host function argument 2 matches the assignment nonce and ensures the transaction was executed within the active assignment window.
4. **Stellar StrKey Checksum Validation**: Client and server enforce valid base32 CRC16 checksums on all Stellar public addresses.
