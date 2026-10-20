import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AssetFaucetService } from '../src/services/faucet.service.js';
import { env } from '../src/config/env.js';

describe('AssetFaucetService', () => {
  let faucetService: AssetFaucetService;
  const originalSecret = env.CAMPUS_ISSUER_SECRET;

  beforeEach(() => {
    (env as any).CAMPUS_ISSUER_SECRET = 'SC7WSNXRI6H3UA6PQ3QSN7T6UAV7UBVYJITPOBWJWOWZ5C3MQGVBJFWV';
    faucetService = new AssetFaucetService();
  });

  afterEach(() => {
    (env as any).CAMPUS_ISSUER_SECRET = originalSecret;
  });

  it('rejects dispensing if CAMPUS_ISSUER_SECRET is not configured', async () => {
    (env as any).CAMPUS_ISSUER_SECRET = '';
    await expect(
      faucetService.dispenseCampusTokens('GSTUDENTTESTWALLETADDRESS12345')
    ).rejects.toThrow(/CAMPUS_ISSUER_SECRET.*not configured/);
  });

  it('rejects dispensing if student has not established a trustline for CAMPUS', async () => {
    // Mock server.loadAccount
    const mockStudentAccount = {
      balances: [
        { asset_type: 'native', balance: '100.0000000' },
      ],
    };

    (faucetService as any).server = {
      loadAccount: vi.fn().mockResolvedValue(mockStudentAccount),
    };

    await expect(
      faucetService.dispenseCampusTokens('GSTUDENTTESTWALLETADDRESS12345')
    ).rejects.toThrow(/has not established a trustline for 'CAMPUS'/);
  });

  it('rejects dispensing if student already holds sufficient CAMPUS tokens (>= 10.0)', async () => {
    const mockStudentAccount = {
      balances: [
        { asset_type: 'native', balance: '100.0000000' },
        {
          asset_code: 'CAMPUS',
          asset_issuer: env.CAMPUS_ASSET_ISSUER,
          balance: '15.0000000',
        },
      ],
    };

    (faucetService as any).server = {
      loadAccount: vi.fn().mockResolvedValue(mockStudentAccount),
    };

    await expect(
      faucetService.dispenseCampusTokens('GSTUDENTTESTWALLETADDRESS12345')
    ).rejects.toThrow(/already holds 15 CAMPUS tokens/);
  });
});
