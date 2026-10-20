import { describe, it, expect, beforeEach } from 'vitest';
import { SubmissionLockService } from '../src/services/verifier/submission-lock.service.js';

class MockPrismaTransactionalClient {
  public assignments: any[] = [];
  public submissions: any[] = [];
  public progress: any[] = [];

  constructor() {
    this.assignments = [
      {
        id: 'asgn_active_1',
        userId: 'usr_1',
        challengeId: 'payment_xlm_003',
        status: 'ACTIVE',
        assignedMemo: 'SC-100200',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour ahead
        createdAt: new Date(),
      },
      {
        id: 'asgn_expired_2',
        userId: 'usr_1',
        challengeId: 'payment_xlm_003',
        status: 'ACTIVE',
        assignedMemo: 'SC-999999',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour past
        createdAt: new Date(Date.now() - 7200000),
      },
    ];
  }

  async $transaction(fn: (tx: any) => Promise<any>) {
    const tx = {
      $queryRaw: async (_query: any, ...params: any[]) => {
        const id = params[0];
        const userId = params[1];
        const found = this.assignments.find((a) => a.id === id && a.userId === userId);
        return found ? [found] : [];
      },
      challengeAssignment: {
        update: async ({ where, data }: any) => {
          const a = this.assignments.find((item) => item.id === where.id);
          if (a) Object.assign(a, data);
          return a;
        },
      },
      submission: {
        findUnique: async ({ where }: any) => {
          return this.submissions.find((s) => s.txHash === where.txHash) || null;
        },
        create: async ({ data }: any) => {
          const item = { id: `sub_${this.submissions.length + 1}`, ...data, createdAt: new Date() };
          this.submissions.push(item);
          return item;
        },
        update: async ({ where, data }: any) => {
          const item = this.submissions.find((s) => s.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
      },
      studentProgress: {
        upsert: async ({ create, update, where }: any) => {
          const existing = this.progress.find(
            (p) => p.userId === where.userId_challengeId.userId && p.challengeId === where.userId_challengeId.challengeId
          );
          if (existing) {
            Object.assign(existing, update);
            return existing;
          } else {
            const item = { id: `prog_${this.progress.length + 1}`, ...create };
            this.progress.push(item);
            return item;
          }
        },
      },
    };

    return await fn(tx);
  }
}

describe('SubmissionLockService Concurrency & Row-Level Locking Guard', () => {
  let mockPrisma: MockPrismaTransactionalClient;
  let lockService: SubmissionLockService;

  beforeEach(() => {
    mockPrisma = new MockPrismaTransactionalClient();
    lockService = new SubmissionLockService(mockPrisma as any);
  });

  it('atomically completes assignment and records progress upon valid verification', async () => {
    const result = await lockService.processWithRowLock(
      'asgn_active_1',
      'usr_1',
      'tx_hash_unique_1',
      async (_assignment) => ({
        isValid: true,
        checks: { transaction_succeeded: true },
      })
    );

    expect(result.status).toBe('VERIFIED');
    expect(mockPrisma.assignments[0].status).toBe('COMPLETED');
    expect(mockPrisma.progress.length).toBe(1);
    expect(mockPrisma.progress[0].challengeId).toBe('payment_xlm_003');
  });

  it('rejects duplicate transaction hash submission globally with 409 Conflict', async () => {
    // First submission
    await lockService.processWithRowLock(
      'asgn_active_1',
      'usr_1',
      'tx_hash_duplicate_target',
      async () => ({ isValid: true, checks: {} })
    );

    // Create another active assignment for same user
    mockPrisma.assignments.push({
      id: 'asgn_active_second',
      userId: 'usr_1',
      challengeId: 'payment_xlm_003',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });

    // Attempt to reuse the same tx_hash
    await expect(
      lockService.processWithRowLock(
        'asgn_active_second',
        'usr_1',
        'tx_hash_duplicate_target',
        async () => ({ isValid: true, checks: {} })
      )
    ).rejects.toThrow('This transaction hash has already been verified.');
  });

  it('marks assignment EXPIRED and rejects submission if past expiry timestamp', async () => {
    await expect(
      lockService.processWithRowLock(
        'asgn_expired_2',
        'usr_1',
        'tx_hash_for_expired',
        async () => ({ isValid: true, checks: {} })
      )
    ).rejects.toThrow('Assignment has expired.');

    expect(mockPrisma.assignments[1].status).toBe('EXPIRED');
  });

  it('allows retrying a previously FAILED transaction hash and transitioning to VERIFIED without unique constraint collision', async () => {
    // 1. Initial attempt fails (e.g. ledger not closed yet or Horizon indexing lag)
    const initialFail = await lockService.processWithRowLock(
      'asgn_active_1',
      'usr_1',
      'tx_hash_pending_confirmation',
      async () => ({ isValid: false, failureReason: 'Transaction not found on Horizon.', checks: {} })
    );

    expect(initialFail.status).toBe('FAILED');
    expect(mockPrisma.submissions.length).toBe(1);
    expect(mockPrisma.submissions[0].status).toBe('FAILED');

    // 2. Retry with same transaction hash once ledger closes
    const retrySuccess = await lockService.processWithRowLock(
      'asgn_active_1',
      'usr_1',
      'tx_hash_pending_confirmation',
      async () => ({ isValid: true, checks: { transaction_succeeded: true } })
    );

    expect(retrySuccess.status).toBe('VERIFIED');
    // Ensure it updated the existing submission rather than creating duplicate row
    expect(mockPrisma.submissions.length).toBe(1);
    expect(mockPrisma.submissions[0].status).toBe('VERIFIED');
    expect(mockPrisma.assignments[0].status).toBe('COMPLETED');
  });
});
