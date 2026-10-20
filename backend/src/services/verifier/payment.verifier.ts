import { HorizonService } from '../horizon.service.js';

export class PaymentVerifier {
  constructor(private horizon: HorizonService) {}

  async verifyPayment(
    txHash: string,
    studentWallet: string,
    expectedDestination: string,
    expectedAmount: string,
    expectedMemo: string,
    assignmentCreatedAt: Date
  ) {
    const tx = await this.horizon.getTransaction(txHash);

    if (!tx) {
      return {
        isValid: false,
        failureReason: 'Transaction hash not found on Stellar Testnet Horizon.',
        checks: {
          transaction_exists: false,
          transaction_succeeded: false,
          source_wallet_matches: false,
          destination_matches: false,
          asset_matches: false,
          amount_matches: false,
          memo_matches: false,
        },
      };
    }

    const txSucceeded = tx.successful === true;
    const memoMatches = tx.memo === expectedMemo;
    const txCreatedAt = new Date(tx.created_at);
    const isFresh = txCreatedAt.getTime() >= assignmentCreatedAt.getTime() - 60000; // 1 min clock skew allowance

    const operations = await this.horizon.getOperations(txHash);

    let sourceWalletMatches = false;
    let destinationMatches = false;
    let assetMatches = false;
    let amountMatches = false;
    let paymentFound = false;

    for (const op of operations) {
      if (op.type === 'payment') {
        paymentFound = true;
        const paymentOp = op as any;

        // Check source: either operation source or transaction fee payer/source
        const effectiveSource = paymentOp.source_account || tx.source_account;
        if (effectiveSource === studentWallet) {
          sourceWalletMatches = true;
        }

        if (paymentOp.to === expectedDestination) {
          destinationMatches = true;
        }

        if (paymentOp.asset_type === 'native') {
          assetMatches = true;
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
      return {
        isValid: false,
        failureReason: 'Transaction was submitted before this challenge assignment started. Old transactions cannot be reused.',
        checks,
      };
    }

    if (!memoMatches) {
      return {
        isValid: false,
        failureReason: `Transaction memo '${tx.memo || 'none'}' does not match the assigned challenge reference '${expectedMemo}'.`,
        checks,
      };
    }

    if (!paymentFound) {
      return { isValid: false, failureReason: 'Transaction does not contain a valid Payment operation.', checks };
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
      return { isValid: false, failureReason: 'Payment asset must be native XLM.', checks };
    }

    if (!amountMatches) {
      return {
        isValid: false,
        failureReason: `Payment amount does not match the required ${expectedAmount} XLM.`,
        checks,
      };
    }

    return { isValid: true, checks };
  }
}
