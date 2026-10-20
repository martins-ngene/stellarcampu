import { Keypair, Horizon, Asset, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { env } from '../config/env.js';

export class AssetFaucetService {
  private server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(env.STELLAR_HORIZON_URL);
  }

  /**
   * Dispenses testnet CAMPUS tokens to an authenticated student's wallet.
   * Enforces:
   * 1. CAMPUS_ISSUER_SECRET configuration.
   * 2. Active trustline for CAMPUS established by student.
   * 3. Balance cap (prevents faucet draining if student already has >= 10.0 CAMPUS).
   */
  async dispenseCampusTokens(studentWallet: string): Promise<{
    success: boolean;
    txHash: string;
    amount: string;
    asset: string;
  }> {
    if (!env.CAMPUS_ISSUER_SECRET) {
      const error: any = new Error('Testnet asset issuer secret (CAMPUS_ISSUER_SECRET) is not configured on this server.');
      error.statusCode = 503;
      throw error;
    }

    let studentAccount: any;
    try {
      studentAccount = await this.server.loadAccount(studentWallet);
    } catch (err: any) {
      const error: any = new Error(`Student account ${studentWallet} could not be loaded from Horizon testnet.`);
      error.statusCode = 404;
      throw error;
    }

    // Verify student has established trustline for CAMPUS
    const trustline = studentAccount.balances.find((b: any) =>
      b.asset_code === 'CAMPUS' && (!env.CAMPUS_ASSET_ISSUER || b.asset_issuer === env.CAMPUS_ASSET_ISSUER)
    );

    if (!trustline) {
      const error: any = new Error(
        `Address ${studentWallet} has not established a trustline for 'CAMPUS'. Please execute a changeTrust operation with Freighter first.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Rate-limiting / hoarding defense: Check if student already has >= 10.0 CAMPUS
    const currentBalance = parseFloat(trustline.balance || '0');
    if (currentBalance >= 10.0) {
      const error: any = new Error(
        `Address already holds ${currentBalance} CAMPUS tokens (10.0 required for challenge). No additional faucet tokens needed.`
      );
      error.statusCode = 400;
      throw error;
    }

    const issuerKeypair = Keypair.fromSecret(env.CAMPUS_ISSUER_SECRET);
    const campusAsset = new Asset('CAMPUS', issuerKeypair.publicKey());
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: '10000',
      networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: studentWallet,
          asset: campusAsset,
          amount: '20.0000000',
        })
      )
      .setTimeout(60)
      .build();

    tx.sign(issuerKeypair);
    const result = await this.server.submitTransaction(tx);

    return {
      success: true,
      txHash: result.hash,
      amount: '20.0000000',
      asset: 'CAMPUS',
    };
  }
}
