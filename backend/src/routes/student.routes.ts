import { FastifyPluginAsync } from 'fastify';
import { getExplorerTxUrl } from '../utils/url.util.js';

export const studentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/students/me/progress - Summary metrics and recent activity
  fastify.get('/students/me/progress', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Students'],
      summary: 'Get student progress and summary metrics',
      description: 'Returns overall challenge completion counters, verified counts, and recent activity.',
      response: {
        200: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                total_challenges: { type: 'number' },
                verified_challenges: { type: 'number' },
                pending_submissions: { type: 'number' },
                failed_submissions: { type: 'number' },
                overall_progress_percent: { type: 'number' },
              },
            },
            recent_activity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  submission_id: { type: 'string' },
                  challenge_title: { type: 'string' },
                  tx_hash: { type: 'string' },
                  status: { type: 'string' },
                  failure_reason: { type: 'string', nullable: true },
                  created_at: { type: 'string' },
                  explorer_url: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    const totalChallenges = await fastify.prisma.challenge.count({
      where: { isActive: true },
    });

    const verifiedProgress = await fastify.prisma.studentProgress.count({
      where: { userId },
    });

    const failedSubmissions = await fastify.prisma.submission.count({
      where: {
        userId,
        status: 'FAILED',
      },
    });

    const recentSubmissions = await fastify.prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        challenge: {
          select: { title: true },
        },
      },
    });

    const overallProgressPercent = totalChallenges > 0
      ? Number(((verifiedProgress / totalChallenges) * 100).toFixed(1))
      : 0;

    return reply.send({
      summary: {
        total_challenges: totalChallenges,
        verified_challenges: verifiedProgress,
        pending_submissions: 0,
        failed_submissions: failedSubmissions,
        overall_progress_percent: overallProgressPercent,
      },
      recent_activity: recentSubmissions.map((s: any) => ({
        submission_id: s.id,
        challenge_title: s.challenge.title,
        tx_hash: s.txHash,
        status: s.status,
        failure_reason: s.failureReason,
        created_at: s.createdAt.toISOString(),
        explorer_url: getExplorerTxUrl(s.txHash),
      })),
    });
  });

  // GET /api/students/me/history - Detailed submission history
  fastify.get('/students/me/history', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Students'],
      summary: 'Get complete submission history',
      description: 'Returns all past student submissions with verification check breakdowns and explorer links.',
      response: {
        200: {
          type: 'object',
          properties: {
            submissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  challenge_id: { type: 'string' },
                  challenge_title: { type: 'string' },
                  tx_hash: { type: 'string' },
                  status: { type: 'string' },
                  failure_reason: { type: 'string', nullable: true },
                  verification_details: { type: 'object', additionalProperties: true, nullable: true },
                  created_at: { type: 'string' },
                  explorer_url: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    const submissions = await fastify.prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        challenge: true,
      },
    });

    return reply.send({
      submissions: submissions.map((s: any) => ({
        id: s.id,
        challenge_id: s.challengeId,
        challenge_title: s.challenge.title,
        tx_hash: s.txHash,
        status: s.status,
        failure_reason: s.failureReason,
        verification_details: s.verificationDetails,
        created_at: s.createdAt.toISOString(),
        explorer_url: getExplorerTxUrl(s.txHash),
      })),
    });
  });
};
