import { buildServer } from './server.js';
import { env } from './config/env.js';

const app = buildServer();

async function start() {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 StellarCampus Fastify Backend running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
