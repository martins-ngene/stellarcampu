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

    function getField(obj: any, key: string): any {
      if (!obj) return undefined;
      if (typeof obj[key] === 'function') return obj[key]();
      return obj[key];
    }

    // Inspect operations within the envelope
    const envAny = envelope as any;
    const txV1 = getField(envAny, 'v1') || envAny;
    const txx = getField(txV1, 'tx') || txV1;
    const ops = getField(txx, 'operations') || [];

    for (const op of ops) {
      const body = getField(op, 'body') || op;
      const invokeOp = getField(body, 'invokeHostFunctionOp');

      if (invokeOp) {
        const hostFn = getField(invokeOp, 'hostFunction');
        const invokeContract = getField(hostFn, 'invokeContract');

        if (invokeContract) {
          const scAddress = getField(invokeContract, 'contractAddress');
          const contractAddressObj = Address.fromScAddress(scAddress);
          foundContractId = contractAddressObj.toString();

          if (foundContractId === expectedContractId) {
            contractMatches = true;
          }

          const fnNameRaw = getField(invokeContract, 'functionName');
          const functionName = fnNameRaw?.toString();
          if (functionName === 'complete_challenge') {
            functionMatches = true;
          }

          const args = getField(invokeContract, 'args') || [];
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
        const authEntries = getField(invokeOp, 'auth') || [];
        for (const auth of authEntries) {
          const credentials = getField(auth, 'credentials');
          const addrCred = getField(credentials, 'address');
          if (addrCred) {
            const scAddr = getField(addrCred, 'address') || addrCred;
            const authorizedAddr = Address.fromScAddress(scAddr).toString();
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
