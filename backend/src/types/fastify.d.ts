import '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      stellarAddress: string;
      role: string;
    };
    user: {
      userId: string;
      stellarAddress: string;
      role: string;
    };
  }
}
