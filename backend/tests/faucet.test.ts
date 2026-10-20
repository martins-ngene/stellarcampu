import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetFaucetService } from '../src/services/faucet.service.js';
import { env } from '../src/config/env.js';

describe('AssetFaucetService', () => {
  let faucetService: AssetFaucetService;

  beforeEach(() => {
    faucetService = new AssetFaucetService();
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
