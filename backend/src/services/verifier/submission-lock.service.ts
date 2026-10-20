import { PrismaClient } from '@prisma/client';

export interface VerificationResult {
  isValid: boolean;
  failureReason?: string;
  checks: Record<string, any>;
}

export class SubmissionLockService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Executes verification within a strict PostgreSQL row-level lock (SELECT ... FOR UPDATE)
   * to eliminate race conditions, double-submissions, and parallel exploit attempts.
   */
  async processWithRowLock(
    assignmentId: string,
    userId: string,
    txHash: string,
    verifyFn: (assignment: any) => Promise<VerificationResult>
  ) {
    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Acquire exclusive pessimistic row lock on the assignment
      const assignments = await tx.$queryRaw<any[]>`
        SELECT * FROM "ChallengeAssignment"
        WHERE id = ${assignmentId} AND "userId" = ${userId}
        FOR UPDATE
      `;

      const assignment = assignments[0];

      if (!assignment) {
        throw new Error('Challenge assignment not found for authenticated user.');
      }

      if (assignment.status !== 'ACTIVE') {
        throw new Error(`Assignment is no longer active (status: ${assignment.status}).`);
      }

      if (new Date() > new Date(assignment.expiresAt)) {
        await tx.challengeAssignment.update({
          where: { id: assignmentId },
          data: { status: 'EXPIRED' },
        });
        throw new Error('Assignment has expired. Please initiate a new challenge.');
      }

      // 2. Enforce global unicity of transaction hash
      const existingSubmission = await tx.submission.findUnique({
        where: { txHash },
      });

      if (existingSubmission && existingSubmission.status === 'VERIFIED') {
        const error: any = new Error('This transaction hash has already been verified.');
        error.statusCode = 409;
        throw error;
      }

      // 3. Execute authoritative blockchain verification (Horizon / Soroban RPC)
      const result = await verifyFn(assignment);

      if (result.isValid) {
        // Mark assignment completed
        await tx.challengeAssignment.update({
          where: { id: assignmentId },
          data: { status: 'COMPLETED' },
        });

        // Insert or update verified submission
        const submission = existingSubmission
          ? await tx.submission.update({
              where: { id: existingSubmission.id },
              data: {
                status: 'VERIFIED',
                failureReason: null,
                verificationDetails: result.checks,
              },
            })
          : await tx.submission.create({
              data: {
                userId,
                challengeId: assignment.challengeId,
                assignmentId,
                txHash,
                status: 'VERIFIED',
                verificationDetails: result.checks,
              },
            });

        // Upsert student progress record
        await tx.studentProgress.upsert({
          where: {
            userId_challengeId: {
              userId,
              challengeId: assignment.challengeId,
            },
          },
          update: {
            submissionId: submission.id,
            completedAt: new Date(),
          },
          create: {
            userId,
            challengeId: assignment.challengeId,
            submissionId: submission.id,
          },
        });

        return {
          status: 'VERIFIED' as const,
          submissionId: submission.id,
          checks: result.checks,
          completedAt: submission.createdAt.toISOString(),
        };
      } else {
        // Record or update failed submission attempt
        const submission = existingSubmission
          ? await tx.submission.update({
              where: { id: existingSubmission.id },
              data: {
                status: 'FAILED',
                failureReason: result.failureReason,
                verificationDetails: result.checks,
              },
            })
          : await tx.submission.create({
              data: {
                userId,
                challengeId: assignment.challengeId,
                assignmentId,
                txHash,
                status: 'FAILED',
                failureReason: result.failureReason,
                verificationDetails: result.checks,
              },
            });

        return {
          status: 'FAILED' as const,
          submissionId: submission.id,
          failureReason: result.failureReason,
          checks: result.checks,
        };
      }
    });
  }
}
