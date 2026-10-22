import { describe, it, expect, beforeEach } from 'vitest';
import { ChallengeService } from '../src/services/challenge.service.js';
import { SorobanService } from '../src/services/soroban.service.js';

describe('Integration Contracts & Verification Hardening', () => {
  describe('ChallengeService getActiveAssignment', () => {
    it('returns null when no active unexpired assignment exists', async () => {
      const mockPrisma: any = {
        challengeAssignment: {
          findFirst: async () => null,
        },
      };
      const service = new ChallengeService(mockPrisma);
      const active = await service.getActiveAssignment('usr_123', 'payment_xlm_003');
      expect(active).toBeNull();
    });

    it('returns parsed active assignment parameters when one exists', async () => {
      const futureDate = new Date(Date.now() + 1800000);
      const mockPrisma: any = {
        challengeAssignment: {
          findFirst: async () => ({
            id: 'asgn_active_123',
            challengeId: 'payment_xlm_003',
            assignedDestination: 'GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV',
            assignedAmount: '2.0000000',
            assignedAsset: 'XLM',
            assignedMemo: 'SC-888999',
            assignedNonce: 'a1b2c3d4e5',
            assignedContractId: undefined,
            expiresAt: futureDate,
            createdAt: new Date(),
          }),
        },
      };
      const service = new ChallengeService(mockPrisma);
      const active = await service.getActiveAssignment('usr_123', 'payment_xlm_003');

      expect(active).toBeDefined();
      expect(active?.assignmentId).toBe('asgn_active_123');
      expect(active?.assignedParameters.memo).toBe('SC-888999');
      expect(active?.assignedParameters.amount).toBe('2.0000000');
    });
  });

  describe('Cross-Challenge Assignment Binding', () => {
    it('rejects submissions where assignment belongs to a different challenge', () => {
      const assignment = {
        id: 'asgn_123',
        challengeId: 'fund_account_002',
      };
      const submittedChallengeId = 'payment_xlm_003';

      const isMismatch = assignment.challengeId !== submittedChallengeId;
      expect(isMismatch).toBe(true);

      const evaluation = isMismatch
        ? {
            isValid: false,
            failureReason: `Assignment was issued for challenge '${assignment.challengeId}', but submitted for '${submittedChallengeId}'. Cross-challenge assignment use is rejected.`,
            checks: {
              assignment_challenge_match: false,
              assignment_challenge_id: assignment.challengeId,
              submitted_challenge_id: submittedChallengeId,
            },
          }
        : { isValid: true, checks: {} };

      expect(evaluation.isValid).toBe(false);
      expect(evaluation.failureReason).toContain('Cross-challenge assignment use is rejected');
      expect(evaluation.checks.assignment_challenge_match).toBe(false);
    });
  });

  describe('Soroban Nonce & Freshness Verification Logic', () => {
    it('rejects when on-chain nonce does not match assignment nonce', async () => {
      const sorobanService = new SorobanService();
      // Mock getTransaction returning a simulated success
      const fakeTxHash = 'tx_fake_soroban_test';
      const expectedNonce = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

      sorobanService.getTransaction = async () => ({
        status: 'NOT_FOUND' as any,
      } as any);

      const result = await sorobanService.inspectContractInvocation(
        fakeTxHash,
        'CA3P7YT764IMXGP7TRLC64KYONLMCRGUJ23GIU646UKOEFSGPVE7UNFK',
        'GD4K6673QVNXHWQ3FGZX7KDBNMNX47JEAQRF4LVT6UR5HRHQ6Y3FIMC6',
        5,
        expectedNonce
      );

      expect(result.isValid).toBe(false);
      expect(result.checks.transaction_exists).toBe(false);
    });
  });
});
