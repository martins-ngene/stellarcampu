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
      security: [{ bearerAuth: [] }],
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
      security: [{ bearerAuth: [] }],
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

  // GET /api/students/me/profile - Get student profile
  fastify.get('/students/me/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Students'],
      summary: 'Get authenticated student profile',
      description: 'Returns profile details including display name, github profile, and experience level.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            displayName: { type: 'string' },
            email: { type: 'string' },
            githubProfile: { type: 'string', nullable: true },
            experienceLevel: { type: 'string', nullable: true },
            learningPath: { type: 'string', nullable: true },
            stellarAddress: { type: 'string' },
            isVerified: { type: 'boolean' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          where: { isVerified: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found.',
      });
    }

    const primaryWallet = user.wallets[0];

    return reply.send({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      githubProfile: user.githubProfile || null,
      experienceLevel: user.experienceLevel || null,
      learningPath: user.learningPath || null,
      stellarAddress: primaryWallet ? primaryWallet.stellarAddress : request.user.stellarAddress,
      isVerified: primaryWallet ? primaryWallet.isVerified : true,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  });

  // PATCH /api/students/me/profile - Update student profile
  fastify.patch('/students/me/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Students'],
      summary: 'Update student profile',
      description: 'Updates student display name, GitHub profile URL, experience level, learning path, and email.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          display_name: { type: 'string' },
          githubProfile: { type: 'string', nullable: true },
          github_profile: { type: 'string', nullable: true },
          experienceLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'], nullable: true },
          experience_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'], nullable: true },
          learningPath: { type: 'string', nullable: true },
          learning_path: { type: 'string', nullable: true },
          email: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            displayName: { type: 'string' },
            email: { type: 'string' },
            githubProfile: { type: 'string', nullable: true },
            experienceLevel: { type: 'string', nullable: true },
            learningPath: { type: 'string', nullable: true },
            stellarAddress: { type: 'string' },
            isVerified: { type: 'boolean' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        409: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;
    const body = (request.body as any) || {};

    const dataToUpdate: any = {};

    const rawDisplayName = body.displayName ?? body.display_name;
    if (rawDisplayName !== undefined) {
      const trimmed = String(rawDisplayName).trim();
      if (trimmed.length > 0) {
        dataToUpdate.displayName = trimmed;
      }
    }

    const rawGithub = body.githubProfile ?? body.github_profile;
    if (rawGithub !== undefined) {
      dataToUpdate.githubProfile = rawGithub ? String(rawGithub).trim() : null;
    }

    const rawLevel = body.experienceLevel ?? body.experience_level;
    if (rawLevel !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (rawLevel === null || validLevels.includes(rawLevel)) {
        dataToUpdate.experienceLevel = rawLevel;
      }
    }

    const rawPath = body.learningPath ?? body.learning_path;
    if (rawPath !== undefined) {
      dataToUpdate.learningPath = rawPath ? String(rawPath).trim() : null;
    }

    if (body.email !== undefined) {
      const trimmedEmail = String(body.email).trim().toLowerCase();
      if (trimmedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        const existing = await fastify.prisma.user.findFirst({
          where: {
            email: trimmedEmail,
            NOT: { id: userId },
          },
        });
        if (existing) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: 'This email is already registered to another account.',
          });
        }
        dataToUpdate.email = trimmedEmail;
      }
    }

    const updatedUser = await fastify.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        wallets: {
          where: { isVerified: true },
          take: 1,
        },
      },
    });

    const primaryWallet = updatedUser.wallets[0];

    return reply.send({
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      githubProfile: updatedUser.githubProfile,
      experienceLevel: updatedUser.experienceLevel,
      learningPath: updatedUser.learningPath,
      stellarAddress: primaryWallet ? primaryWallet.stellarAddress : request.user.stellarAddress,
      isVerified: primaryWallet ? primaryWallet.isVerified : true,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  });
};
