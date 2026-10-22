import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export class ChallengeService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Retrieves all challenges, decorated with the student's personal completion status
   */
  async listChallengesForStudent(userId: string) {
    const challenges = await this.prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        progress: {
          where: { userId },
        },
      },
    });

    return challenges.map((ch: any) => {
      const isCompleted = ch.progress.length > 0;
      return {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        category: ch.category,
        difficulty: ch.difficulty,
        network: ch.network,
        expectedOpType: ch.expectedOpType,
        orderIndex: ch.orderIndex,
        status: isCompleted ? 'COMPLETED' : 'AVAILABLE',
        completedAt: isCompleted ? ch.progress[0].completedAt : null,
      };
    });
  }

  /**
   * Retrieves specific challenge details
   */
  async getChallengeById(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) return null;
    if (challenge.id === 'asset_transfer_004' && challenge.config) {
      return {
        ...challenge,
        config: {
          ...(challenge.config as any),
          assetIssuer: env.CAMPUS_ASSET_ISSUER,
        },
      };
    }
    return challenge;
  }

  /**
   * Generates a time-bounded dynamic challenge assignment with unique memo & parameters
   */
  async startChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new Error(`Challenge with ID '${challengeId}' not found.`);
    }

    if (!challenge.isActive) {
      throw new Error(`Challenge '${challenge.title}' is currently inactive.`);
    }

    // Generate unique challenge memo (SC-XXXXXX) to prevent replay/scraping of other transactions
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const assignedMemo = `SC-${randomSuffix}`;

    // Generate 32-byte cryptographic nonce for Soroban contract invocation
    const assignedNonce = crypto.randomBytes(32).toString('hex');

    // TTL of 60 minutes
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const config = challenge.config as any;

    const assignment = await this.prisma.challengeAssignment.create({
      data: {
        userId,
        challengeId,
        assignedMemo,
        assignedNonce,
        assignedDestination: env.CAMPUS_VAULT_ADDRESS,
        assignedAmount: config?.amount || '2.0000000',
        assignedAsset: config?.assetCode || (config?.asset === 'native' ? 'XLM' : 'XLM'),
        assignedContractId: env.SOROBAN_CONTRACT_ID || undefined,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    return {
      assignmentId: assignment.id,
      challengeId: assignment.challengeId,
      assignedParameters: {
        destination: assignment.assignedDestination,
        amount: assignment.assignedAmount,
        asset: assignment.assignedAsset,
        assetIssuer: assignment.challengeId === 'asset_transfer_004' ? env.CAMPUS_ASSET_ISSUER : undefined,
        memo: assignment.assignedMemo,
        nonce: assignment.assignedNonce,
        contractId: assignment.assignedContractId,
      },
      expiresAt: assignment.expiresAt.toISOString(),
    };
  }

  /**
   * Retrieves the current active, unexpired assignment for a user on a given challenge, if one exists
   */
  async getActiveAssignment(userId: string, challengeId: string) {
    const assignment = await this.prisma.challengeAssignment.findFirst({
      where: {
        userId,
        challengeId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!assignment) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      challengeId: assignment.challengeId,
      assignedParameters: {
        destination: assignment.assignedDestination,
        amount: assignment.assignedAmount,
        asset: assignment.assignedAsset,
        assetIssuer: assignment.challengeId === 'asset_transfer_004' ? env.CAMPUS_ASSET_ISSUER : undefined,
        memo: assignment.assignedMemo,
        nonce: assignment.assignedNonce,
        contractId: assignment.assignedContractId,
      },
      expiresAt: assignment.expiresAt.toISOString(),
      createdAt: assignment.createdAt.toISOString(),
    };
  }
}
