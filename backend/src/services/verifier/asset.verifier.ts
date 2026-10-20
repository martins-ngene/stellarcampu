import { HorizonService } from '../horizon.service.js';

export class AssetVerifier {
  constructor(private horizon: HorizonService) {}

  async verifyAssetTransfer(
    txHash: string,
    studentWallet: string,
    expectedDestination: string,
    expectedAssetCode: string,
    expectedIssuer: string,
    expectedAmount: string,
    expectedMemo: string,
    assignmentCreatedAt: Date
  ) {
    const tx = await this.horizon.getTransaction(txHash);

    if (!tx) {
      return {
        isValid: false,
        failureReason: 'Transaction hash not found on Stellar Testnet Horizon.',
        checks: { transaction_exists: false },
      };
    }

    const txSucceeded = tx.successful === true;
    const memoMatches = tx.memo === expectedMemo;
    const txCreatedAt = new Date(tx.created_at);
    const isFresh = txCreatedAt.getTime() >= assignmentCreatedAt.getTime() - 60000;

    const operations = await this.horizon.getOperations(txHash);

    let sourceWalletMatches = false;
    let destinationMatches = false;
    let assetMatches = false;
    let amountMatches = false;
    let paymentFound = false;

    for (const op of operations) {
      if (op.type === 'payment' || op.type === 'path_payment_strict_send') {
        paymentFound = true;
        const paymentOp = op as any;

        const effectiveSource = paymentOp.source_account || tx.source_account;
        if (effectiveSource === studentWallet) {
          sourceWalletMatches = true;
        }

        if (paymentOp.to === expectedDestination) {
          destinationMatches = true;
        }

        const isCustomAsset =
          paymentOp.asset_type !== 'native' &&
          paymentOp.asset_code === expectedAssetCode;

        if (isCustomAsset) {
          // If issuer is configured, verify issuer as well
          if (!expectedIssuer || paymentOp.asset_issuer === expectedIssuer) {
            assetMatches = true;
          }
        }

        if (parseFloat(paymentOp.amount) === parseFloat(expectedAmount)) {
          amountMatches = true;
        }

        if (sourceWalletMatches && destinationMatches && assetMatches && amountMatches) {
          break;
        }
      }
    }

    const checks = {
      transaction_exists: true,
      transaction_succeeded: txSucceeded,
      payment_operation_found: paymentFound,
      source_wallet_matches: sourceWalletMatches,
      destination_matches: destinationMatches,
      asset_matches: assetMatches,
      amount_matches: amountMatches,
      memo_matches: memoMatches,
      is_fresh: isFresh,
    };

    if (!txSucceeded) {
      return { isValid: false, failureReason: 'The submitted Stellar transaction failed on-chain.', checks };
    }

    if (!isFresh) {
      return { isValid: false, failureReason: 'Transaction was submitted before this challenge assignment started.', checks };
    }

    if (!memoMatches) {
      return {
        isValid: false,
        failureReason: `Transaction memo '${tx.memo || 'none'}' does not match the assigned challenge reference '${expectedMemo}'.`,
        checks,
      };
    }

    if (!paymentFound) {
      return { isValid: false, failureReason: 'Transaction does not contain a valid asset transfer operation.', checks };
    }

    if (!sourceWalletMatches) {
      return {
        isValid: false,
        failureReason: `Payment source does not match the authenticated student wallet (${studentWallet}).`,
        checks,
      };
    }

    if (!destinationMatches) {
      return {
        isValid: false,
        failureReason: 'Payment destination does not match the assigned campus destination address.',
        checks,
      };
    }

    if (!assetMatches) {
      return {
        isValid: false,
        failureReason: `Transferred asset does not match the required '${expectedAssetCode}' asset.`,
        checks,
      };
    }

    if (!amountMatches) {
      return {
        isValid: false,
        failureReason: `Transfer amount does not match required ${expectedAmount} ${expectedAssetCode}.`,
        checks,
      };
    }

    return { isValid: true, checks };
  }
}
