# Agent Operating Rules & Constraints

## Critical Git Instruction
- **DO NOT PUSH AUTOMATICALLY**: Under NO circumstances should git changes, commits, or tags be pushed automatically to remote repositories (`origin` or any remote).
- Git branch creation, and local staging may be performed, but `git push`, `git add` and `git commit` must strictly be requested and confirmed by the user.

## Engineering Mandates
- **Deployment Target**: First deployment for Soroban smart contracts is on **Stellar Testnet**.
- **Backend Architecture**: Fastify framework with TypeScript.
- **Database & Persistence**: PostgreSQL with Prisma ORM.
- **Authentication**: Bearer Token (JWT / Signed Session Token) authenticated via cryptographic wallet signatures.
- **Concurrency & Replay Defense**: PostgreSQL row-level locks (`SELECT ... FOR UPDATE` / Prisma transactional boundaries) for replay prevention, rate limiting, and atomic assignment evaluation.
- **Frontend Collaboration**: Maintain `HANDSHAKE.md` as the authoritative integration contract for frontend engineers.
