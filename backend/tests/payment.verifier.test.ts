import { describe, it, expect } from 'vitest';
import { PaymentVerifier } from '../src/services/verifier/payment.verifier.js';

class MockHorizonService {
  constructor(
    private mockTx: any,
    private mockOps: any[]
  ) {}

  async getTransaction(_hash: string) {
    return this.mockTx;
  }

  async getOperations(_hash: string) {
    return this.mockOps;
  }

  async getAccount(_id: string) {
    return { exists: true, nativeBalance: 10 };
  }
}

describe('PaymentVerifier Engine Checks', () => {
  const studentWallet = 'GBBD47IF6LWK7P7MDEVTESTNETSTUDENT123456789012345678901234';
  const vaultAddress = 'GCA3D5JCAMPUSVAULTDESTINATIONTESTNET123456789012345678901';
  const assignedMemo = 'SC-582910';
  const assignedAmount = '2.0000000';
  const assignmentCreatedAt = new Date('2026-10-20T12:00:00Z');

  it('passes when transaction meets all semantic verification rules', async () => {
    const mockTx = {
      successful: true,
      source_account: studentWallet,
      memo: assignedMemo,
      created_at: '2026-10-20T12:05:00Z',
    };
    const mockOps = [
      {
        type: 'payment',
        source_account: studentWallet,
        to: vaultAddress,
        asset_type: 'native',
        amount: '2.0000000',
      },
    ];

    const horizon = new MockHorizonService(mockTx, mockOps);
    const verifier = new PaymentVerifier(horizon as any);

    const result = await verifier.verifyPayment(
      'a1b2c3d4e5f6',
      studentWallet,
      vaultAddress,
      assignedAmount,
      assignedMemo,
      assignmentCreatedAt
    );

    expect(result.isValid).toBe(true);
    expect(result.checks.transaction_succeeded).toBe(true);
    expect(result.checks.memo_matches).toBe(true);
    expect(result.checks.amount_matches).toBe(true);
  });

  it('rejects when transaction memo does not match assigned memo', async () => {
    const mockTx = {
      successful: true,
      source_account: studentWallet,
      memo: 'WRONG-MEMO-999',
      created_at: '2026-10-20T12:05:00Z',
    };
    const mockOps = [
      {
        type: 'payment',
        source_account: studentWallet,
        to: vaultAddress,
        asset_type: 'native',
        amount: '2.0000000',
      },
    ];

    const horizon = new MockHorizonService(mockTx, mockOps);
    const verifier = new PaymentVerifier(horizon as any);

    const result = await verifier.verifyPayment(
      'a1b2c3d4e5f6',
      studentWallet,
      vaultAddress,
      assignedAmount,
      assignedMemo,
      assignmentCreatedAt
    );

    expect(result.isValid).toBe(false);
    expect(result.failureReason).toContain('does not match the assigned challenge reference');
    expect(result.checks.memo_matches).toBe(false);
  });

  it('rejects when payment destination is incorrect', async () => {
    const mockTx = {
      successful: true,
      source_account: studentWallet,
      memo: assignedMemo,
      created_at: '2026-10-20T12:05:00Z',
    };
    const mockOps = [
      {
        type: 'payment',
        source_account: studentWallet,
        to: 'GSOMEOTHERPERSON12345678901234567890123456789012345678901',
        asset_type: 'native',
        amount: '2.0000000',
      },
    ];

    const horizon = new MockHorizonService(mockTx, mockOps);
    const verifier = new PaymentVerifier(horizon as any);

    const result = await verifier.verifyPayment(
      'a1b2c3d4e5f6',
      studentWallet,
      vaultAddress,
      assignedAmount,
      assignedMemo,
      assignmentCreatedAt
    );

    expect(result.isValid).toBe(false);
    expect(result.failureReason).toContain('destination does not match');
    expect(result.checks.destination_matches).toBe(false);
  });

  it('rejects stale transactions submitted prior to challenge assignment start', async () => {
    const mockTx = {
      successful: true,
      source_account: studentWallet,
      memo: assignedMemo,
      created_at: '2026-10-19T10:00:00Z', // 1 day before
    };
    const mockOps = [
      {
        type: 'payment',
        source_account: studentWallet,
        to: vaultAddress,
        asset_type: 'native',
        amount: '2.0000000',
      },
    ];

    const horizon = new MockHorizonService(mockTx, mockOps);
    const verifier = new PaymentVerifier(horizon as any);

    const result = await verifier.verifyPayment(
      'a1b2c3d4e5f6',
      studentWallet,
      vaultAddress,
      assignedAmount,
      assignedMemo,
      assignmentCreatedAt
    );

    expect(result.isValid).toBe(false);
    expect(result.failureReason).toContain('before this challenge assignment started');
  });
});
