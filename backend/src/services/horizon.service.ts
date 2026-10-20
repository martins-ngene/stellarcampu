import { Horizon } from '@stellar/stellar-sdk';
import { env } from '../config/env.js';

export class HorizonService {
  private server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(env.STELLAR_HORIZON_URL);
  }

  /**
   * Retrieves transaction details by hash from Stellar Horizon
   */
  async getTransaction(txHash: string) {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return tx;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw new Error(`Horizon transaction query error: ${err.message || 'Unknown network error'}`);
    }
  }

  /**
   * Retrieves operations for a given transaction hash
   */
  async getOperations(txHash: string) {
    try {
      const ops = await this.server.operations().forTransaction(txHash).call();
      return ops.records;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return [];
      }
      throw new Error(`Horizon operations query error: ${err.message || 'Unknown network error'}`);
    }
  }

  /**
   * Checks if an account exists on Testnet and retrieves its native balance
   */
  async getAccount(accountId: string) {
    try {
      const account = await this.server.accounts().accountId(accountId).call();
      const nativeBalance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
      return {
        exists: true,
        account,
        nativeBalance: parseFloat(nativeBalance),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { exists: false, account: null, nativeBalance: 0 };
      }
      throw new Error(`Horizon account query error: ${err.message || 'Unknown network error'}`);
    }
  }
}
