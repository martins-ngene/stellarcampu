import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'StellarCampus Automated Verification API',
        description:
          'Authoritative REST API and Swagger UI for Stellar developer challenges, Ed25519 wallet authentication, and automated on-chain verification on Stellar Testnet.',
        version: '1.0.0',
        contact: {
          name: 'StellarCampus Team',
          url: 'https://stellarcampus.dev',
        },
      },
      servers: [
        {
          url: '/',
          description: 'Current Server (Auto-detected)',
        },
        {
          url: 'https://stellarcampus-backend.onrender.com',
          description: 'Live Production Gateway (Render)',
        },
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Local Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Provide Bearer JWT token received from POST /api/auth/verify',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Cryptographic Ed25519 wallet challenge-response and session issuance' },
        { name: 'Challenges', description: 'Challenge library, dynamic assignment generation, and on-chain verification' },
        { name: 'Students', description: 'Student metrics, completion counters, and audit history' },
        { name: 'Admin', description: 'Program administrator metrics and challenge activation controls' },
        { name: 'System', description: 'Health and liveness probes' },
      ],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
};

export default fp(swaggerPlugin);
