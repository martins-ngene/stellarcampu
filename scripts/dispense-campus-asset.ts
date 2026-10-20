import process from 'node:process';
import { Keypair, Horizon, Asset, Operation, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);
const NETWORK_PASSPHRASE = Networks.TESTNET;

const CAMPUS_ASSET_CODE = 'CAMPUS';

/**
 * Dispenses testnet CAMPUS tokens to a student address that has established a trustline.
 * Usage:
 *   npx tsx scripts/dispense-campus-asset.ts <STUDENT_PUBLIC_KEY> [ISSUER_SECRET_KEY]
 */
async function main() {
  const targetAddress = process.argv[2];
  const issuerSecret = process.argv[3] || process.env.CAMPUS_ISSUER_SECRET;

  if (!targetAddress) {
    console.error('Usage: npx tsx scripts/dispense-campus-asset.ts <STUDENT_PUBLIC_KEY> [ISSUER_SECRET_KEY]');
    process.exit(1);
  }

  console.log(`Checking trustline for address: ${targetAddress}...`);
  const account = await server.loadAccount(targetAddress);

  const trustline = account.balances.find(
    (b: any) => b.asset_code === CAMPUS_ASSET_CODE
  );

  if (!trustline) {
    console.error(`❌ Address ${targetAddress} has NOT established a trustline for asset '${CAMPUS_ASSET_CODE}'.`);
    console.error(`Please establish a trustline with changeTrust operation first.`);
    process.exit(1);
  }

  console.log(`✅ Trustline exists! Current ${CAMPUS_ASSET_CODE} balance: ${(trustline as any).balance}`);

  if (!issuerSecret) {
    console.log('\n⚠️ No ISSUER_SECRET provided. Provide issuer secret as argument or CAMPUS_ISSUER_SECRET env var to dispense tokens.');
    process.exit(0);
  }

  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const campusAsset = new Asset(CAMPUS_ASSET_CODE, issuerKeypair.publicKey());
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  console.log(`Sending 20.0 ${CAMPUS_ASSET_CODE} to ${targetAddress}...`);
  const tx = new TransactionBuilder(issuerAccount, {
    fee: '10000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: targetAddress,
        asset: campusAsset,
        amount: '20.0000000',
      })
    )
    .setTimeout(180)
    .build();

  tx.sign(issuerKeypair);
  const result = await server.submitTransaction(tx);
  console.log(`🎉 Successfully dispensed 20 ${CAMPUS_ASSET_CODE}! Hash: ${result.hash}`);
}

main().catch((err) => {
  console.error('Dispense failed:', err.message);
  process.exit(1);
});
