import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';

const challengeSchema = z.object({
  stellar_address: z.string().min(56).max(56),
});

const verifySchema = z.object({
  stellar_address: z.string().min(56).max(56),
  signature: z.string().min(1),
  username: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
});

const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'object', additionalProperties: true },
  },
};

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  // POST /api/auth/challenge - Generate authentication nonce
  fastify.post('/auth/challenge', {
    schema: {
      tags: ['Auth'],
      summary: 'Request authentication challenge nonce',
      description: 'Generates a 32-byte cryptographic nonce for Ed25519 wallet signing with a 15-minute expiration.',
      body: {
        type: 'object',
        required: ['stellar_address'],
        properties: {
          stellar_address: {
            type: 'string',
            description: 'Stellar public address (G...)',
            example: 'GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nonce: { type: 'string' },
            message: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
        400: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parseResult = challengeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid stellar_address supplied',
        details: parseResult.error.format(),
      });
    }

    try {
      const challenge = await authService.generateNonce(parseResult.data.stellar_address);
      return reply.send(challenge);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // POST /api/auth/verify - Verify Ed25519 signature & issue Bearer JWT
  fastify.post('/auth/verify', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify Ed25519 signature & obtain Bearer JWT',
      description: 'Validates cryptographic wallet signature of the challenge nonce and issues a 24-hour Bearer JWT token.',
      body: {
        type: 'object',
        required: ['stellar_address', 'signature'],
        properties: {
          stellar_address: {
            type: 'string',
            description: 'Stellar public address (G...)',
            example: 'GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV',
          },
          signature: {
            type: 'string',
            description: 'Base64 encoded Ed25519 signature of the challenge message',
            example: 'dGhpcyBpcyBhIHNhbXBsZSBlZDI1NTE5IHNpZ25hdHVyZQ==',
          },
          username: {
            type: 'string',
            description: 'Optional username',
            example: 'student_dev',
          },
          email: {
            type: 'string',
            description: 'Optional email',
            example: 'student@stellarcampus.xyz',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                displayName: { type: 'string' },
                email: { type: 'string' },
                stellarAddress: { type: 'string' },
                isVerified: { type: 'boolean' },
                role: { type: 'string' },
              },
            },
          },
        },
        400: errorSchema,
        401: errorSchema,
      },
    },
  }, async (request, reply) => {
    const parseResult = verifySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid signature verification payload',
        details: parseResult.error.format(),
      });
    }

    try {
      const { stellar_address, signature, username, email } = parseResult.data;
      const result = await authService.verifySignature(stellar_address, signature, username, email);

      const token = fastify.jwt.sign({
        userId: result.user.id,
        stellarAddress: result.user.stellarAddress,
        role: result.user.role,
      });

      return reply.send({
        token,
        user: result.user,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: err.message || 'Signature verification failed',
      });
    }
  });
};
