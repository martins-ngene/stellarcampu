import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChallengeService } from '../services/challenge.service.js';
import { HorizonService } from '../services/horizon.service.js';
import { SorobanService } from '../services/soroban.service.js';
import { PaymentVerifier } from '../services/verifier/payment.verifier.js';
import { AssetVerifier } from '../services/verifier/asset.verifier.js';
import { AssetFaucetService } from '../services/faucet.service.js';
import { SubmissionLockService } from '../services/verifier/submission-lock.service.js';
import { env } from '../config/env.js';
import { getExplorerTxUrl } from '../utils/url.util.js';

const submitSchema = z.object({
  assignment_id: z.string().uuid(),
  transaction_hash: z.string().min(10).max(66).optional(),
});

export const challengeRoutes: FastifyPluginAsync = async (fastify) => {
  const challengeService = new ChallengeService(fastify.prisma);
  const horizonService = new HorizonService();
  const sorobanService = new SorobanService();
  const paymentVerifier = new PaymentVerifier(horizonService);
  const assetVerifier = new AssetVerifier(horizonService);
  const faucetService = new AssetFaucetService();
  const lockService = new SubmissionLockService(fastify.prisma);

  // GET /api/challenges - List challenges for authenticated student
  fastify.get('/challenges', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const challenges = await challengeService.listChallengesForStudent(userId);
    return reply.send({ challenges });
  });

  // GET /api/challenges/:id - Get challenge details
  fastify.get<{ Params: { id: string } }>('/challenges/:id', async (request, reply) => {
    const challenge = await challengeService.getChallengeById(request.params.id);
    if (!challenge) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Challenge not found',
      });
    }
    return reply.send(challenge);
  });

  // POST /api/challenges/:id/start - Generate dynamic assignment
  fastify.post<{ Params: { id: string } }>('/challenges/:id/start', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    try {
      const assignment = await challengeService.startChallenge(userId, request.params.id);
      return reply.status(201).send(assignment);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message,
      });
    }
  });

  // POST /api/challenges/:id/claim-tokens - Dispense testnet CAMPUS tokens for Challenge 4
  fastify.post<{ Params: { id: string } }>('/challenges/:id/claim-tokens', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const challengeId = request.params.id;
    if (challengeId !== 'asset_transfer_004') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: "Token faucet is only available for challenge 'asset_transfer_004'.",
      });
    }

    const studentWallet = request.user.stellarAddress;
    try {
      const result = await faucetService.dispenseCampusTokens(studentWallet);
      return reply.send({
        status: 'DISPENSED',
        message: 'Successfully dispensed 20.0 CAMPUS tokens to your wallet.',
        transaction_hash: result.txHash,
        amount: result.amount,
        asset: result.asset,
        explorer_url: getExplorerTxUrl(result.txHash),
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 503 ? 'Service Unavailable' : 'Bad Request',
        message: err.message,
      });
    }
  });

  // POST /api/challenges/:id/submit - Submit evidence & execute row-locked verification
  fastify.post<{ Params: { id: string } }>('/challenges/:id/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = submitSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid submission payload',
        details: parseResult.error.format(),
      });
    }

    const userId = request.user.userId;
    const studentWallet = request.user.stellarAddress;
    const challengeId = request.params.id;
    const { assignment_id, transaction_hash } = parseResult.data;

    const cleanHash = transaction_hash
      ? transaction_hash.trim().toLowerCase().replace(/^0x/, '')
      : undefined;
    const txHashToUse = cleanHash || `account_eval_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const result = await lockService.processWithRowLock(
        assignment_id,
        userId,
        txHashToUse,
        async (assignment) => {
          // Dispatch verification based on challenge ID
          if (challengeId === 'wallet_verify_001') {
            const wallet = await fastify.prisma.wallet.findUnique({
              where: { stellarAddress: studentWallet },
            });
            const isVerified = wallet?.isVerified === true;
            return {
              isValid: isVerified,
              failureReason: isVerified ? undefined : 'Wallet ownership has not been verified cryptographically.',
              checks: { wallet_verified: isVerified },
            };
          }

          if (challengeId === 'fund_account_002') {
            const accInfo = await horizonService.getAccount(studentWallet);
            const isValid = accInfo.exists && accInfo.nativeBalance >= 1.0;
            return {
              isValid,
              failureReason: !accInfo.exists
                ? 'Account does not exist on Stellar Testnet yet. Use Friendbot to fund it.'
                : accInfo.nativeBalance < 1.0
                ? `Account balance (${accInfo.nativeBalance} XLM) is below the required 1.0 XLM.`
                : undefined,
              checks: {
                account_exists: accInfo.exists,
                balance_sufficient: accInfo.nativeBalance >= 1.0,
                native_balance: accInfo.nativeBalance,
              },
            };
          }

          if (challengeId === 'payment_xlm_003') {
            if (!cleanHash) {
              return {
                isValid: false,
                failureReason: 'Transaction hash is required for payment verification.',
                checks: { transaction_exists: false },
              };
            }

            return await paymentVerifier.verifyPayment(
              cleanHash,
              studentWallet,
              assignment.assignedDestination || env.CAMPUS_VAULT_ADDRESS,
              assignment.assignedAmount || '2.0000000',
              assignment.assignedMemo || '',
              assignment.createdAt
            );
          }

          if (challengeId === 'asset_transfer_004') {
            if (!cleanHash) {
              return {
                isValid: false,
                failureReason: 'Transaction hash is required for asset transfer verification.',
                checks: { transaction_exists: false },
              };
            }

            return await assetVerifier.verifyAssetTransfer(
              cleanHash,
              studentWallet,
              assignment.assignedDestination || env.CAMPUS_VAULT_ADDRESS,
              assignment.assignedAsset || 'CAMPUS',
              env.CAMPUS_ASSET_ISSUER,
              assignment.assignedAmount || '10.0000000',
              assignment.assignedMemo || '',
              assignment.createdAt
            );
          }

          if (challengeId === 'soroban_contract_005') {
            if (!cleanHash) {
              return {
                isValid: false,
                failureReason: 'Transaction hash is required for Soroban contract verification.',
                checks: { transaction_exists: false },
              };
            }

            const contractIdToVerify = assignment.assignedContractId || env.SOROBAN_CONTRACT_ID;
            return await sorobanService.inspectContractInvocation(
              cleanHash,
              contractIdToVerify,
              studentWallet,
              5
            );
          }

          return {
            isValid: false,
            failureReason: `Unknown challenge ID '${challengeId}'.`,
            checks: {},
          };
        }
      );

      const explorerUrl = getExplorerTxUrl(txHashToUse);
      const enhancedResult = {
        ...result,
        explorer_url: explorerUrl,
      };

      if (result.status === 'VERIFIED') {
        return reply.send(enhancedResult);
      } else {
        return reply.status(422).send(enhancedResult);
      }
    } catch (err: any) {
      if (err.statusCode === 409) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: err.message,
        });
      }
      request.log.error(err);
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message,
      });
    }
  });
};
