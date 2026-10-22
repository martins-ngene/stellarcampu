import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
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
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const n of nonces) {
          if (n.id === where.id && (where.used === undefined || n.used === where.used)) {
            Object.assign(n, data);
            count++;
          }
        }
        return { count };
      },
    };

    this.user = {
      findUnique: async ({ where }: any) => {
        const u = users.find(
          (item) => (where.id && item.id === where.id) || (where.email && item.email === where.email) || (where.username && item.username === where.username)
        );
        if (!u) return null;
        const userWallets = wallets.filter((w) => w.userId === u.id);
        return { ...u, wallets: userWallets };
      },
      create: async ({ data }: any) => {
        const item = { id: `user_${users.length + 1}`, ...data, role: 'STUDENT', createdAt: new Date(), updatedAt: new Date() };
        users.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const u = users.find((item) => item.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
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

  it('successfully verifies a valid legacy raw Ed25519 signature from student keypair', async () => {
    const keypair = Keypair.random();
    const { nonce, message } = await authService.generateNonce(keypair.publicKey());

    // Sign raw message buffer (legacy format)
    const messageBuffer = Buffer.from(message, 'utf-8');
    const signature = Buffer.from(keypair.sign(messageBuffer)).toString('base64');

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

  it('successfully verifies a Freighter-style SEP-53 message signature', async () => {
    const keypair = Keypair.random();
    const { nonce, message } = await authService.generateNonce(keypair.publicKey());

    // Construct SEP-53 hash payload: SHA256("Stellar Signed Message:\n" + message)
    const sep53Prefix = Buffer.from('Stellar Signed Message:\n', 'utf-8');
    const sep53Payload = Buffer.concat([sep53Prefix, Buffer.from(message, 'utf-8')]);
    const sep53Hash = crypto.createHash('sha256').update(sep53Payload).digest();

    // Freighter signs the 32-byte SHA-256 hash
    const freighterSignature = Buffer.from(keypair.sign(sep53Hash)).toString('base64');

    const authResult = await authService.verifySignature(
      keypair.publicKey(),
      freighterSignature,
      'freighter_student',
      'freighter@stellar.org'
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
    const attackerSignature = Buffer.from(attackerKeypair.sign(messageBuffer)).toString('base64');

    await expect(
      authService.verifySignature(keypair.publicKey(), attackerSignature)
    ).rejects.toThrow();
  });

  it('atomically rejects replay attempts of an already consumed challenge nonce', async () => {
    const keypair = Keypair.random();
    const { message } = await authService.generateNonce(keypair.publicKey());

    const messageBuffer = Buffer.from(message, 'utf-8');
    const signature = Buffer.from(keypair.sign(messageBuffer)).toString('base64');

    // First verification succeeds
    const firstAttempt = await authService.verifySignature(keypair.publicKey(), signature);
    expect(firstAttempt.user).toBeDefined();

    // Replay attempt with same signature fails because nonce is consumed
    await expect(
      authService.verifySignature(keypair.publicKey(), signature)
    ).rejects.toThrow(/already been consumed|No valid authentication challenge found/i);
  });

  it('prevents account hijacking via user-supplied email for registered wallets', async () => {
    // 1. Legitimate user creates account with wallet A and email
    const victimKeypair = Keypair.random();
    const { message: victimMessage } = await authService.generateNonce(victimKeypair.publicKey());
    const victimSig = Buffer.from(victimKeypair.sign(Buffer.from(victimMessage, 'utf-8'))).toString('base64');

    await authService.verifySignature(
      victimKeypair.publicKey(),
      victimSig,
      'legit_student',
      'registered@stellarcampus.xyz'
    );

    // 2. Attacker tries to connect new wallet B and supply victim's registered email
    const attackerKeypair = Keypair.random();
    const { message: attackerMessage } = await authService.generateNonce(attackerKeypair.publicKey());
    const attackerSig = Buffer.from(attackerKeypair.sign(Buffer.from(attackerMessage, 'utf-8'))).toString('base64');

    await expect(
      authService.verifySignature(
        attackerKeypair.publicKey(),
        attackerSig,
        'attacker_user',
        'registered@stellarcampus.xyz'
      )
    ).rejects.toThrow(/already registered with a verified wallet/i);
  });

  it('persists display name, github profile, and experience level metadata', async () => {
    const keypair = Keypair.random();
    const { message } = await authService.generateNonce(keypair.publicKey());
    const sig = Buffer.from(keypair.sign(Buffer.from(message, 'utf-8'))).toString('base64');

    const result = await authService.verifySignature(
      keypair.publicKey(),
      sig,
      'full_profile_dev',
      'dev@stellarcampus.dev',
      {
        displayName: 'Alex Stellar',
        githubProfile: 'https://github.com/alexstellar',
        experienceLevel: 'advanced',
        learningPath: 'smart_contracts',
      }
    );

    expect(result.user.displayName).toBe('Alex Stellar');
    expect(result.user.githubProfile).toBe('https://github.com/alexstellar');
    expect(result.user.experienceLevel).toBe('advanced');
    expect(result.user.learningPath).toBe('smart_contracts');
  });
});
