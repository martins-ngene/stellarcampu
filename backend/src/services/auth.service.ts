import crypto from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { PrismaClient } from '@prisma/client';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a random cryptographic nonce for wallet ownership verification
   */
  async generateNonce(stellarAddress: string) {
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    await this.prisma.nonceChallenge.create({
      data: {
        stellarAddress,
        nonce,
        expiresAt,
      },
    });

    const message = `Sign this message to authenticate with StellarCampus: ${nonce}`;
    return { nonce, message, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Verifies the ed25519 signature of the challenge nonce using the public key
   */
  async verifySignature(stellarAddress: string, signature: string, username?: string, email?: string) {
    // 1. Fetch latest active nonce for address
    const challenge = await this.prisma.nonceChallenge.findFirst({
      where: {
        stellarAddress,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new Error('No valid authentication challenge found or challenge has expired');
    }

    const message = `Sign this message to authenticate with StellarCampus: ${challenge.nonce}`;

    // 2. Cryptographic Ed25519 signature verification supporting SEP-53 (Freighter standard) & legacy raw
    try {
      const keypair = Keypair.fromPublicKey(stellarAddress);
      const signatureBuffer = Buffer.from(signature, 'base64');
      const messageBuffer = Buffer.from(message, 'utf-8');

      let isValid = false;

      // Method A: SEP-53 standard format used by Freighter and Stellar Wallets Kit
      // Hash = SHA256("Stellar Signed Message:\n" + message)
      try {
        const sep53Prefix = Buffer.from('Stellar Signed Message:\n', 'utf-8');
        const sep53Payload = Buffer.concat([sep53Prefix, messageBuffer]);
        const sep53Hash = crypto.createHash('sha256').update(sep53Payload).digest();
        isValid = keypair.verify(sep53Hash, signatureBuffer);
      } catch (_err) {
        isValid = false;
      }

      // Method B: Legacy raw format (direct Ed25519 signature over message bytes)
      if (!isValid) {
        try {
          isValid = keypair.verify(messageBuffer, signatureBuffer);
        } catch (_err) {
          isValid = false;
        }
      }

      // Method C: SEP-53 prefix without SHA-256 hashing (alternative web wallet fallback)
      if (!isValid) {
        try {
          const sep53Prefix = Buffer.from('Stellar Signed Message:\n', 'utf-8');
          const sep53Payload = Buffer.concat([sep53Prefix, messageBuffer]);
          isValid = keypair.verify(sep53Payload, signatureBuffer);
        } catch (_err) {
          isValid = false;
        }
      }

      if (!isValid) {
        throw new Error('Invalid signature');
      }
    } catch (err: any) {
      throw new Error(`Ed25519 verification failed: ${err.message || 'Signature mismatch'}`);
    }

    // 3. Mark challenge nonce as used
    await this.prisma.nonceChallenge.update({
      where: { id: challenge.id },
      data: { used: true },
    });

    // 4. Find or create User and Wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { stellarAddress },
      include: { user: true },
    });

    let user;
    if (!wallet) {
      const generatedUsername = username || `builder_${stellarAddress.slice(0, 6).toLowerCase()}`;
      const generatedEmail = email || `${generatedUsername}@stellarcampus.dev`;

      user = await this.prisma.user.upsert({
        where: { email: generatedEmail },
        update: {},
        create: {
          email: generatedEmail,
          username: generatedUsername,
          displayName: generatedUsername,
        },
      });

      wallet = await this.prisma.wallet.create({
        data: {
          userId: user.id,
          stellarAddress,
          isVerified: true,
          verifiedAt: new Date(),
        },
        include: { user: true },
      });
    } else {
      user = wallet.user;
      if (!wallet.isVerified) {
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { isVerified: true, verifiedAt: new Date() },
        });
      }
    }

    // 5. Automatically record Challenge 1 completion in StudentProgress
    try {
      const challenge1 = await this.prisma.challenge.findUnique({
        where: { id: 'wallet_verify_001' },
      });
      if (challenge1) {
        // Create submission and mark challenge 1 verified
        const dummyAssignment = await this.prisma.challengeAssignment.upsert({
          where: { id: challenge.id },
          update: { status: 'COMPLETED' },
          create: {
            id: challenge.id,
            userId: user.id,
            challengeId: challenge1.id,
            status: 'COMPLETED',
            expiresAt: challenge.expiresAt,
          },
        });

        const sub = await this.prisma.submission.upsert({
          where: { txHash: `wallet_proof_${wallet.stellarAddress}` },
          update: { status: 'VERIFIED' },
          create: {
            userId: user.id,
            challengeId: challenge1.id,
            assignmentId: dummyAssignment.id,
            txHash: `wallet_proof_${wallet.stellarAddress}`,
            status: 'VERIFIED',
            verificationDetails: {
              ed25519_verified: true,
              nonce: challenge.nonce,
            },
          },
        });

        await this.prisma.studentProgress.upsert({
          where: {
            userId_challengeId: {
              userId: user.id,
              challengeId: challenge1.id,
            },
          },
          update: { submissionId: sub.id, completedAt: new Date() },
          create: {
            userId: user.id,
            challengeId: challenge1.id,
            submissionId: sub.id,
          },
        });
      }
    } catch (_err) {
      // Non-fatal
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        stellarAddress: wallet.stellarAddress,
        isVerified: true,
        role: user.role,
      },
    };
  }
}
