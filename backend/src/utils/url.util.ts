/**
 * Conditional URL helpers for blockchain explorer and environment endpoints
 */

export function getExplorerTxUrl(txHash?: string | null, network: 'testnet' | 'public' = 'testnet'): string | null {
  if (!txHash) return null;
  // Filter out internal synthetic transaction hashes
  if (txHash.startsWith('wallet_proof_') || txHash.startsWith('account_eval_') || txHash.length < 32) {
    return null;
  }
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

export function getExplorerAccountUrl(address?: string | null, network: 'testnet' | 'public' = 'testnet'): string | null {
  if (!address || address.length !== 56 || !address.startsWith('G')) {
    return null;
  }
  return `https://stellar.expert/explorer/${network}/account/${address}`;
}

export function getExplorerContractUrl(contractId?: string | null, network: 'testnet' | 'public' = 'testnet'): string | null {
  if (!contractId || contractId.length !== 56 || !contractId.startsWith('C')) {
    return null;
  }
  return `https://lab.stellar.org/r/${network}/contract/${contractId}`;
}
