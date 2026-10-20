import { describe, it, expect, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from '../src/services/auth.service.js';

class MockPrismaClient {
  public nonceChallenge: any;
  public wallet: any;
  public user: any;

  constructor() {
    const nonces: any[] = [];
    const users: any[] = [];
    const wallets: any[] = [];

    this.nonceChallenge = {
      create: async ({ data }: any) => {
        const item = { id: `nonce_${nonces.length + 1}`, ...data, used: false, createdAt: new Date() };
        nonces.push(item);
        return item;
      },
      findFirst: async ({ where }: any) => {
        return nonces.find(
          (n) => n.stellarAddress === where.stellarAddress && (!where.used || n.used === where.used)
        ) || null;
      },
      update: async ({ where, data }: any) => {
        const item = nonces.find((n) => n.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    };

    this.user = {
      upsert: async ({ create }: any) => {
        const item = { id: `user_${users.length + 1}`, ...create, role: 'STUDENT', createdAt: new Date(), updatedAt: new Date() };
        users.push(item);
        return item;
      },
    };

    this.wallet = {
      findUnique: async ({ where }: any) => {
        const w = wallets.find((item) => item.stellarAddress === where.stellarAddress);
        if (!w) return null;
        const u = users.find((item) => item.id === w.userId);
        return { ...w, user: u };
      },
      create: async ({ data }: any) => {
        const item = { id: `wallet_${wallets.length + 1}`, ...data };
        wallets.push(item);
        const u = users.find((user) => user.id === item.userId);
        return { ...item, user: u };
      },
      update: async ({ where, data }: any) => {
        const w = wallets.find((item) => item.id === where.id);
        if (w) Object.assign(w, data);
        return w;
      },
    };
  }
}

describe('AuthService Cryptographic Verification', () => {
  let prisma: any;
  let authService: AuthService;

  beforeEach(() => {
    prisma = new MockPrismaClient();
    authService = new AuthService(prisma);
  });

  it('generates a 64-char hex cryptographic nonce with 15-minute TTL', async () => {
    const keypair = Keypair.random();
    const result = await authService.generateNonce(keypair.publicKey());

    expect(result.nonce).toBeDefined();
    expect(result.nonce.length).toBe(64);
    expect(result.message).toContain(result.nonce);
  });

  it('successfully verifies a valid Ed25519 signature from student keypair', async () => {
    const keypair = Keypair.random();
    const { nonce, message } = await authService.generateNonce(keypair.publicKey());

    // Sign message using genuine Stellar Keypair
    const messageBuffer = Buffer.from(message, 'utf-8');
    const signature = keypair.sign(messageBuffer).toString('base64');

    const authResult = await authService.verifySignature(
      keypair.publicKey(),
      signature,
      'stellar_tester',
      'tester@example.com'
    );

    expect(authResult.user).toBeDefined();
    expect(authResult.user.stellarAddress).toBe(keypair.publicKey());
    expect(authResult.user.isVerified).toBe(true);
  });

  it('rejects an invalid or forged Ed25519 signature', async () => {
    const keypair = Keypair.random();
    const attackerKeypair = Keypair.random();

    const { message } = await authService.generateNonce(keypair.publicKey());

    // Attacker signs message with wrong private key
    const messageBuffer = Buffer.from(message, 'utf-8');
    const attackerSignature = attackerKeypair.sign(messageBuffer).toString('base64');

    await expect(
      authService.verifySignature(keypair.publicKey(), attackerSignature)
    ).rejects.toThrow();
  });
});
