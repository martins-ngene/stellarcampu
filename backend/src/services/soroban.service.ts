import { rpc, xdr, scValToNative, Address } from '@stellar/stellar-sdk';
import { env } from '../config/env.js';

export class SorobanService {
  private server: rpc.Server;

  constructor() {
    this.server = new rpc.Server(env.STELLAR_SOROBAN_RPC_URL);
  }

  /**
   * Retrieves Soroban transaction result from Soroban RPC
   */
  async getTransaction(txHash: string) {
    try {
      const response = await this.server.getTransaction(txHash);
      return response;
    } catch (err: any) {
      throw new Error(`Soroban RPC getTransaction error: ${err.message || 'RPC failure'}`);
    }
  }

  /**
   * Evaluates Soroban transaction for contract invocation and authorized student identity
   */
  async inspectContractInvocation(txHash: string, expectedContractId: string, expectedStudent: string, expectedChallengeId: number) {
    const tx = await this.getTransaction(txHash);

    if (tx.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return {
        isValid: false,
        failureReason: 'Transaction not found on Stellar Testnet Soroban RPC.',
        checks: { transaction_exists: false },
      };
    }

    if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
      return {
        isValid: false,
        failureReason: 'The Soroban transaction failed during execution on-chain.',
        checks: { transaction_exists: true, transaction_succeeded: false },
      };
    }

    if (tx.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        isValid: false,
        failureReason: `Transaction is still pending with status: ${(tx as any).status}`,
        checks: { transaction_exists: true, transaction_succeeded: false },
      };
    }

    // Inspect envelope and meta
    const envelope = tx.envelopeXdr;
    let contractMatches = false;
    let functionMatches = false;
    let studentAuthorized = false;
    let challengeIdMatches = false;
    let foundContractId = '';

    // Inspect operations within the envelope
    const txV1 = envelope.v1();
    const ops = txV1.tx().operations();

    for (const op of ops) {
      const body = op.body() as any;
      if (body.arm?.() === 'invokeHostFunctionOp' || body.switch?.()?.name === 'invokeHostFunctionOp') {
        const invokeOp = body.invokeHostFunctionOp();
        const hostFn = invokeOp.hostFunction() as any;

        if (hostFn.arm?.() === 'invokeContract' || hostFn.switch?.()?.name === 'invokeContract') {
          const contractArgs = hostFn.invokeContract();
          const contractAddressObj = Address.fromScAddress(contractArgs.contractAddress());
          foundContractId = contractAddressObj.toString();

          if (foundContractId === expectedContractId) {
            contractMatches = true;
          }

          const functionName = contractArgs.functionName().toString();
          if (functionName === 'complete_challenge') {
            functionMatches = true;
          }

          const args = contractArgs.args();
          if (args.length >= 2) {
            // Arg 0: student address
            const argStudentAddr = Address.fromScVal(args[0]).toString();
            if (argStudentAddr === expectedStudent) {
              studentAuthorized = true;
            }

            // Arg 1: challenge_id u32
            const argChallengeId = scValToNative(args[1]);
            if (Number(argChallengeId) === Number(expectedChallengeId)) {
              challengeIdMatches = true;
            }
          }
        }

        // Also check authorized auth entries in the host function
        const authEntries = invokeOp.auth();
        for (const auth of authEntries) {
          const credentials = auth.credentials() as any;
          if (credentials.arm?.() === 'address' || credentials.switch?.()?.name === 'address') {
            const addrCred = credentials.address();
            const authorizedAddr = Address.fromScAddress(addrCred.address()).toString();
            if (authorizedAddr === expectedStudent) {
              studentAuthorized = true;
            }
          }
        }
      }
    }

    const checks = {
      transaction_exists: true,
      transaction_succeeded: true,
      contract_matches: contractMatches,
      function_matches: functionMatches,
      student_authorized: studentAuthorized,
      challenge_id_matches: challengeIdMatches,
    };

    if (!contractMatches) {
      return {
        isValid: false,
        failureReason: `Invoked contract (${foundContractId || 'none'}) does not match the StellarCampus challenge contract (${expectedContractId}).`,
        checks,
      };
    }

    if (!functionMatches) {
      return {
        isValid: false,
        failureReason: "Invoked contract function is not 'complete_challenge'.",
        checks,
      };
    }

    if (!studentAuthorized) {
      return {
        isValid: false,
        failureReason: `The contract invocation was not authorized by the student wallet (${expectedStudent}).`,
        checks,
      };
    }

    if (!challengeIdMatches) {
      return {
        isValid: false,
        failureReason: `Challenge ID argument does not match expected challenge (${expectedChallengeId}).`,
        checks,
      };
    }

    return {
      isValid: true,
      checks,
    };
  }
}
