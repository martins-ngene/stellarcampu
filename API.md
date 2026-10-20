# StellarCampus REST API Documentation

Authoritative API specification for the **StellarCampus** automated on-chain verification backend.

- **Interactive Swagger UI**: [`http://localhost:3001/docs`](http://localhost:3001/docs)
- **OpenAPI 3.0 JSON Spec**: [`http://localhost:3001/docs/json`](http://localhost:3001/docs/json)
- **Base URL (Local)**: `http://localhost:3001/api`
- **Network Environment**: Stellar Testnet
- **Authentication Scheme**: `Authorization: Bearer <jwt_token>`

> [!TIP]
> **Conditional URL Rendering**: All responses containing blockchain explorer links (`explorer_url`, `contract_url`, `account_url`) conditionally render `null` for synthetic internal proof identifiers (e.g. `wallet_proof_*`, `account_eval_*`) and only render verified Stellar Expert / Stellar Lab links for authentic 64-char transaction hashes, 56-char `G...` public keys, and 56-char `C...` contract IDs.

---

## Table of Contents
1. [Authentication (`/api/auth`)](#1-authentication)
   - [Request Signing Nonce](#post-apiauthchallenge)
   - [Verify Signature & Obtain JWT](#post-apiauthverify)
2. [Challenges & Verification (`/api/challenges`)](#2-challenges--verification)
   - [List Challenges with Progress](#get-apichallenges)
   - [Get Challenge Details](#get-apichallengesid)
   - [Start Dynamic Assignment](#post-apichallengesidstart)
   - [Submit Evidence for Verification](#post-apichallengesidsubmit)
3. [Student Progress & History (`/api/students`)](#3-student-progress--history)
   - [Get Student Metrics & Recent Activity](#get-apistudentsmeprogress)
   - [Get Full Submission History](#get-apistudentsmehistory)
4. [Admin Monitoring (`/api/admin`)](#4-admin-monitoring)
   - [Platform Metrics](#get-apiadminmetrics)
   - [All Submissions Log](#get-apiadminsubmissions)
   - [Toggle Challenge Status](#patch-apiadminchallengesid)
5. [System Health](#5-system-health)
   - [Health Check](#get-health)

---

## 1. Authentication

### `POST /api/auth/challenge`
Generates a random cryptographic nonce (32-byte hex) with a 15-minute expiration window for wallet ownership verification.

- **Auth Required**: No
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "stellar_address": "GBBD47IF6LWK7P7MDEVTESTNETSTUDENT123456789012345678901234"
}
```

#### Response `200 OK`
```json
{
  "nonce": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "message": "Sign this message to authenticate with StellarCampus: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "expiresAt": "2026-10-20T13:30:00.000Z"
}
```

---

### `POST /api/auth/verify`
Verifies the Ed25519 signature of the challenge message using the wallet's public key. On success, issues a 24-hour signed JWT Bearer token and automatically credits **Challenge 1 (Wallet Ownership Verification)** in the student's progress.

- **Auth Required**: No
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "stellar_address": "GBBD47IF6LWK7P7MDEVTESTNETSTUDENT123456789012345678901234",
  "signature": "base64_encoded_ed25519_signature",
  "username": "alex_builder",
  "email": "alex@stellar.org"
}
```

#### Response `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfOTI4Mzc...",
  "user": {
    "id": "c1f7a28b-...",
    "username": "alex_builder",
    "displayName": "alex_builder",
    "email": "alex@stellar.org",
    "stellarAddress": "GBBD47IF6LWK7P7MDEVTESTNETSTUDENT123456789012345678901234",
    "isVerified": true,
    "role": "STUDENT"
  }
}
```

#### Error `401 Unauthorized`
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Ed25519 verification failed: Signature mismatch"
}
```

---

## 2. Challenges & Verification

### `GET /api/challenges`
Returns all active technical challenges along with the authenticated student's completion badge (`COMPLETED` or `AVAILABLE`).

- **Auth Required**: Yes (`Authorization: Bearer <token>`)

#### Response `200 OK`
```json
{
  "challenges": [
    {
      "id": "wallet_verify_001",
      "title": "Wallet Ownership Verification",
      "description": "Connect your Stellar wallet and sign a dynamic challenge to verify ownership.",
      "category": "Wallet & Account",
      "difficulty": "Beginner",
      "network": "testnet",
      "expectedOpType": "SIGNATURE_CHALLENGE",
      "orderIndex": 1,
      "status": "COMPLETED",
      "completedAt": "2026-10-20T12:00:00.000Z"
    },
    {
      "id": "fund_account_002",
      "title": "Fund a Stellar Testnet Account",
      "category": "Wallet & Account",
      "difficulty": "Beginner",
      "status": "AVAILABLE",
      "completedAt": null
    },
    {
      "id": "payment_xlm_003",
      "title": "Execute an XLM Payment",
      "category": "Stellar Payments",
      "difficulty": "Intermediate",
      "status": "AVAILABLE",
      "completedAt": null
    },
    {
      "id": "asset_transfer_004",
      "title": "Transfer a Supported Stellar Asset",
      "category": "Stellar Assets",
      "difficulty": "Intermediate",
      "status": "AVAILABLE",
      "completedAt": null
    },
    {
      "id": "soroban_contract_005",
      "title": "Interact with a Soroban Smart Contract",
      "category": "Soroban Smart Contracts",
      "difficulty": "Advanced",
      "status": "AVAILABLE",
      "completedAt": null
    }
  ]
}
```

---

### `GET /api/challenges/:id`
Retrieves full instructions and configuration parameters for a specific challenge.

- **Auth Required**: No

#### Response `200 OK`
```json
{
  "id": "payment_xlm_003",
  "title": "Execute an XLM Payment",
  "description": "Send a payment of 2.0 XLM to the StellarCampus Testnet vault including your unique challenge memo.",
  "category": "Stellar Payments",
  "difficulty": "Intermediate",
  "network": "testnet",
  "expectedOpType": "PAYMENT",
  "config": {
    "type": "payment",
    "asset": "native",
    "amount": "2.0000000",
    "requireMemo": true,
    "instructions": "Submit a native payment of 2 XLM to the assigned destination with your assigned unique memo."
  },
  "isActive": true
}
```

---

### `POST /api/challenges/:id/start`
Generates a time-bounded dynamic challenge assignment with a unique memo or nonce. This prevents replay attacks and scraping of past transactions.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)

#### Response `201 Created`
```json
{
  "assignmentId": "a92e104b-3d61-412e-a34e-09f182cba541",
  "challengeId": "payment_xlm_003",
  "assignedParameters": {
    "destination": "GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV",
    "amount": "2.0000000",
    "asset": "XLM",
    "memo": "SC-491029",
    "nonce": "7a8b9c0d1e2f3a4b...",
    "contractId": "CA3P7YT764IMXGP7TRLC64KYONLMCRGUJ23GIU646UKOEFSGPVE7UNFK"
  },
  "expiresAt": "2026-10-20T14:15:00.000Z"
}
```

---

### `POST /api/challenges/:id/submit`
Submits on-chain transaction evidence (hash) for authoritative blockchain verification. Executes under **PostgreSQL row-level locking (`SELECT ... FOR UPDATE`)** to prevent concurrent double-submissions.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "assignment_id": "a92e104b-3d61-412e-a34e-09f182cba541",
  "transaction_hash": "3e9b72a4b865511b81cd70f730248ad8a230..."
}
```

#### Response `200 OK` (Verification Passed)
```json
{
  "status": "VERIFIED",
  "submissionId": "sub_948271",
  "checks": {
    "transaction_exists": true,
    "transaction_succeeded": true,
    "payment_operation_found": true,
    "source_wallet_matches": true,
    "destination_matches": true,
    "asset_matches": true,
    "amount_matches": true,
    "memo_matches": true,
    "is_fresh": true
  },
  "completedAt": "2026-10-20T13:20:15.000Z"
}
```

#### Response `422 Unprocessable Entity` (Verification Failed)
```json
{
  "status": "FAILED",
  "submissionId": "sub_948272",
  "failureReason": "Transaction memo 'SC-123456' does not match the assigned challenge reference 'SC-491029'.",
  "checks": {
    "transaction_exists": true,
    "transaction_succeeded": true,
    "payment_operation_found": true,
    "source_wallet_matches": true,
    "destination_matches": true,
    "asset_matches": true,
    "amount_matches": true,
    "memo_matches": false,
    "is_fresh": true
  }
}
```

#### Response `409 Conflict` (Duplicate Evidence Replay)
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "This transaction hash has already been verified."
}
```

---

## 3. Student Progress & History

### `GET /api/students/me/progress`
Returns overall completion metrics and recent submissions.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)

#### Response `200 OK`
```json
{
  "summary": {
    "total_challenges": 5,
    "verified_challenges": 3,
    "pending_submissions": 0,
    "failed_submissions": 1,
    "overall_progress_percent": 60.0
  },
  "recent_activity": [
    {
      "submission_id": "sub_948271",
      "challenge_title": "Execute an XLM Payment",
      "tx_hash": "3e9b72a4...",
      "status": "VERIFIED",
      "failure_reason": null,
      "created_at": "2026-10-20T13:20:15.000Z",
      "explorer_url": "https://stellar.expert/explorer/testnet/tx/3e9b72a4..."
    }
  ]
}
```

---

### `GET /api/students/me/history`
Returns exhaustive history of all past student submissions with full check breakdowns and explorer links.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)

#### Response `200 OK`
```json
{
  "submissions": [
    {
      "id": "sub_948271",
      "challenge_id": "payment_xlm_003",
      "challenge_title": "Execute an XLM Payment",
      "tx_hash": "3e9b72a4...",
      "status": "VERIFIED",
      "failure_reason": null,
      "verification_details": {
        "transaction_exists": true,
        "transaction_succeeded": true,
        "memo_matches": true
      },
      "created_at": "2026-10-20T13:20:15.000Z",
      "explorer_url": "https://stellar.expert/explorer/testnet/tx/3e9b72a4..."
    }
  ]
}
```

---

## 4. Admin Monitoring

### `GET /api/admin/metrics`
Platform-wide stats for program administrators.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)

#### Response `200 OK`
```json
{
  "registered_students": 42,
  "connected_wallets": 39,
  "total_submissions": 118,
  "verified_submissions": 84,
  "failed_submissions": 34,
  "verification_service_status": "HEALTHY"
}
```

---

### `PATCH /api/admin/challenges/:id`
Toggles challenge active status.

- **Auth Required**: Yes (`Authorization: Bearer <token>`)
- **Request Body**: `{ "isActive": false }`
- **Response `200 OK`**: Updated challenge record.

---

## 5. System Health

### `GET /health`
Liveness probe.

- **Auth Required**: No
- **Response `200 OK`**:
```json
{
  "status": "OK",
  "timestamp": "2026-10-20T13:25:00.000Z"
}
```
