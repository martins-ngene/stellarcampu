import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import prismaPlugin from './plugins/prisma.js';
import jwtPlugin from './plugins/jwt.js';
import swaggerPlugin from './plugins/swagger.js';
import { authRoutes } from './routes/auth.routes.js';
import { challengeRoutes } from './routes/challenge.routes.js';
import { studentRoutes } from './routes/student.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

export function buildServer(): FastifyInstance {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Security & Utility Plugins
  fastify.register(sensible);
  fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger OpenAPI Documentation & Interactive UI (/docs)
  fastify.register(swaggerPlugin);

  // Database & Auth
  fastify.register(prismaPlugin);
  fastify.register(jwtPlugin);

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      docs_url: '/docs',
      network: 'Stellar Testnet',
    };
  });

  // Redirect /documentation to /docs
  fastify.get('/documentation', async (_request, reply) => {
    return reply.redirect('/docs');
  });

  // API Routes
  fastify.register(authRoutes, { prefix: '/api' });
  fastify.register(challengeRoutes, { prefix: '/api' });
  fastify.register(studentRoutes, { prefix: '/api' });
  fastify.register(adminRoutes, { prefix: '/api' });

  return fastify;
}
