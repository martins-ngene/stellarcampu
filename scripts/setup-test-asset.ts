import { Keypair, Horizon, Asset, Operation, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

async function fundWithFriendbot(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) {
    throw new Error(`Friendbot failed with status ${res.status}`);
  }
}

async function main() {
  console.log('=== Setting up CAMPUS Testnet Asset Issuer ===');

  const issuerKeypair = Keypair.random();
  console.log(`Generated Issuer Public Key: ${issuerKeypair.publicKey()}`);

  console.log('Funding issuer via Friendbot...');
  await fundWithFriendbot(issuerKeypair.publicKey());
  console.log('✅ Issuer funded!');

  const campusAsset = new Asset('CAMPUS', issuerKeypair.publicKey());
  console.log(`Asset identifier: ${campusAsset.getCode()}:${campusAsset.getIssuer()}`);

  console.log('\n--- Add this to your backend/.env ---');
  console.log(`CAMPUS_ASSET_ISSUER="${issuerKeypair.publicKey()}"`);
}

main().catch((err) => {
  console.error('Setup asset failed:', err);
  process.exit(1);
});
