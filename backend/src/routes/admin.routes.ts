import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const updateChallengeSchema = z.object({
  isActive: z.boolean(),
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/admin/metrics - Global platform statistics
  fastify.get('/admin/metrics', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    // Only admins or authorized users
    if (request.user.role !== 'ADMIN' && process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Admin access required' });
    }

    const [totalStudents, verifiedWallets, totalSubmissions, verifiedSubmissions, failedSubmissions] = await Promise.all([
      fastify.prisma.user.count({ where: { role: 'STUDENT' } }),
      fastify.prisma.wallet.count({ where: { isVerified: true } }),
      fastify.prisma.submission.count(),
      fastify.prisma.submission.count({ where: { status: 'VERIFIED' } }),
      fastify.prisma.submission.count({ where: { status: 'FAILED' } }),
    ]);

    return reply.send({
      registered_students: totalStudents,
      connected_wallets: verifiedWallets,
      total_submissions: totalSubmissions,
      verified_submissions: verifiedSubmissions,
      failed_submissions: failedSubmissions,
      verification_service_status: 'HEALTHY',
    });
  });

  // GET /api/admin/submissions - Filterable global submission log
  fastify.get('/admin/submissions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submissions = await fastify.prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { username: true, email: true } },
        challenge: { select: { title: true } },
      },
    });

    return reply.send({ submissions });
  });

  // PATCH /api/admin/challenges/:id - Activate or deactivate challenge
  fastify.patch<{ Params: { id: string } }>('/admin/challenges/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = updateChallengeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid payload' });
    }

    const updated = await fastify.prisma.challenge.update({
      where: { id: request.params.id },
      data: { isActive: parseResult.data.isActive },
    });

    return reply.send(updated);
  });
};
